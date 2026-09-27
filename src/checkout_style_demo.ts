const response = await fetch("http://localhost:3000/appointment-guidance", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    patientId: "patient-1042",
    appointmentAt: "2026-09-08T09:30:00.000Z",
    patientNote: "Where do I check in for my routine appointment?",
  }),
});

console.log(JSON.stringify(await response.json(), null, 2));
