import assert from "node:assert/strict";
import test from "node:test";
import { chooseNotificationAction } from "../src/notification_policy.js";

test("routes a time-sensitive patient note to staff instead of an automated reminder", () => {
  const decision = chooseNotificationAction("I have chest pain before tomorrow's appointment");

  assert.deepEqual(decision, {
    action: "staff_review",
    reason: "The patient note contains a time-sensitive symptom.",
  });
});

test("allows routine appointment operations to use a reminder", () => {
  const decision = chooseNotificationAction("Where should I check in tomorrow?");
  assert.equal(decision.action, "send_reminder");
});
