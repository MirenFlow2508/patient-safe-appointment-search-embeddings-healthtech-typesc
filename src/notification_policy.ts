export type NotificationDecision = {
  action: "send_reminder" | "staff_review";
  reason: string;
};

const TIME_SENSITIVE_TERMS = [
  "chest pain",
  "cannot breathe",
  "severe bleeding",
  "unconscious",
];

export function chooseNotificationAction(note: string): NotificationDecision {
  const normalized = note.toLowerCase();
  const needsReview = TIME_SENSITIVE_TERMS.some((term) => normalized.includes(term));

  if (needsReview) {
    return {
      action: "staff_review",
      reason: "The patient note contains a time-sensitive symptom.",
    };
  }

  return {
    action: "send_reminder",
    reason: "The request is limited to routine appointment operations.",
  };
}
