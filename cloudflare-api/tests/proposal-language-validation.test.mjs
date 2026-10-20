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

test("proposal drafts cannot claim technologies missing from the user's profile", () => {
  assert.equal(proposalValidationIssue("Я можу інтегрувати PHP-код у цей сайт.", "uk", ["HTML", "CSS", "JavaScript"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("I can build this with PHP.", "en", ["PHP", "JavaScript"]), null);
  assert.equal(proposalValidationIssue("I can adapt the OpenCart admin panel.", "en", ["HTML", "CSS"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("Мої навички включають UML і BPMN.", "uk", ["Python", "SQL"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("I wrote a pytest suite for a medical bot.", "en", ["Python"]), "unsupported_experience");
});
