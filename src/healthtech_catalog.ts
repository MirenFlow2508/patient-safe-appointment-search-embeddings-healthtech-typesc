import OpenAI from "openai";

export type GuideDocument = {
  id: string;
  title: string;
  text: string;
};

export type SearchHit = GuideDocument & { score: number };

const guides: GuideDocument[] = [
  {
    id: "arrival-window",
    title: "Arrival and check-in",
    text: "Ask patients to arrive 15 minutes before the appointment and bring a photo ID and insurance card.",
  },
  {
    id: "rescheduling",
    title: "Rescheduling an appointment",
    text: "For routine rescheduling, offer the clinic phone number and ask the patient to contact the scheduling team.",
  },
  {
    id: "urgent-symptoms",
    title: "Time-sensitive symptoms",
    text: "Do not use an automated appointment message for time-sensitive symptoms. Route the note to clinical staff for review.",
  },
];

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const leftLength = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightLength = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return leftLength && rightLength ? dot / (leftLength * rightLength) : 0;
}

export class HealthtechCatalog {
  private readonly ai: OpenAI;
  private documentEmbeddings: number[][] | undefined;

  constructor(ai: OpenAI) {
    this.ai = ai;
  }

  private async index(): Promise<number[][]> {
    if (!this.documentEmbeddings) {
      const response = await this.ai.embeddings.create({
        model: "auto",
        input: guides.map((guide) => guide.text),
      });
      this.documentEmbeddings = response.data.map((item) => item.embedding);
    }
    return this.documentEmbeddings;
  }

  async search(query: string, limit = 2): Promise<SearchHit[]> {
    const [documentEmbeddings, queryResponse] = await Promise.all([
      this.index(),
      this.ai.embeddings.create({ model: "auto", input: query }),
    ]);
    const queryEmbedding = queryResponse.data[0]?.embedding;
    if (!queryEmbedding) throw new Error("Embedding response did not contain an item.");

    return guides
      .map((guide, index) => ({
        ...guide,
        score: cosine(queryEmbedding, documentEmbeddings[index] ?? []),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }
}
