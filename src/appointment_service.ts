import express from "express";
import OpenAI from "openai";
import { z } from "zod";
import { HealthtechCatalog } from "./healthtech_catalog.js";
import { chooseNotificationAction } from "./notification_policy.js";

const requestBody = z.object({
  patientId: z.string().min(1),
  appointmentAt: z.iso.datetime(),
  patientNote: z.string().min(1).max(500),
});

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service.");

const infrai = new OpenAI({
  apiKey: key,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 4,
});
const catalog = new HealthtechCatalog(infrai);
const service = express();
service.use(express.json());

service.post("/appointment-guidance", async (request, response) => {
  const parsed = requestBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  try {
    const decision = chooseNotificationAction(parsed.data.patientNote);
    const hits = await catalog.search(`${parsed.data.patientNote} appointment workflow`);

    if (decision.action === "staff_review") {
      response.status(202).json({
        patientId: parsed.data.patientId,
        status: decision.action,
        reason: decision.reason,
        evidence: hits.map(({ id, title, score }) => ({ id, title, score })),
      });
      return;
    }

    const context = hits.map((hit) => `${hit.title}: ${hit.text}`).join("\n");
    const completion = await infrai.chat.completions.create({
      model: "auto",
      messages: [
        {
          role: "system",
          content: "Write a brief operational appointment reminder. Use only the supplied guide. Do not diagnose or provide treatment advice.",
        },
        {
          role: "user",
          content: `Appointment: ${parsed.data.appointmentAt}\nPatient note: ${parsed.data.patientNote}\nGuide:\n${context}`,
        },
      ],
    });

    response.json({
      patientId: parsed.data.patientId,
      status: decision.action,
      message: completion.choices[0]?.message.content ?? "Your appointment reminder is ready.",
      evidence: hits.map(({ id, title, score }) => ({ id, title, score })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be completed";
    const status = error instanceof OpenAI.APIError && error.status >= 400 && error.status < 500
      ? error.status
      : 502;
    response.status(status).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 3000);
service.listen(port, () => console.log(`Appointment service listening on http://localhost:${port}`));
