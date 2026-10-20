import test from "node:test";
import assert from "node:assert/strict";
import { proposalValidationIssue } from "../.test-dist/src/index.js";

test("Russian proposals preserve formal capitalization", () => {
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок Вы рассматриваете?", "ru"), null);
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок вы рассматриваете?", "ru"), "formal_address");
});

test("Ukrainian proposals reject Russian phrases and lowercase formal address", () => {
  assert.equal(proposalValidationIssue("Шановний клієнте, уточните, який строк виконання ви очікуєте?", "uk"), "language");
  assert.equal(proposalValidationIssue("Будь ласка, повідомте, який термін Ви розглядаєте?", "uk"), null);
  assert.equal(proposalValidationIssue("Будь ласка, повідомте, який термін ви розглядаєте?", "uk"), "formal_address");
});
