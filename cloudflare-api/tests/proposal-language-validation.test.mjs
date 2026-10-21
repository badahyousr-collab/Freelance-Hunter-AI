import test from "node:test";
import assert from "node:assert/strict";
import { detectProjectLanguage, proposalValidationIssue, safeFallbackProposal } from "../.test-dist/src/index.js";

test("Russian proposals preserve formal capitalization", () => {
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок Вы рассматриваете?", "ru"), null);
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок вы рассматриваете?", "ru"), "formal_address");
});

test("Ukrainian proposals reject Russian phrases and lowercase formal address", () => {
  assert.equal(proposalValidationIssue("Шановний клієнте, уточните, який строк виконання ви очікуєте?", "uk"), "language");
  assert.equal(proposalValidationIssue("Будь ласка, повідомте, який термін Ви розглядаєте?", "uk"), null);
  assert.equal(proposalValidationIssue("Будь ласка, повідомте, який термін ви розглядаєте?", "uk"), "formal_address");
});

test("proposal drafts ask about project requirements instead of the client's experience or team", () => {
  assert.equal(proposalValidationIssue("Чи був у Вас досвід із медичними системами?", "uk"), "irrelevant_client_qualification_question");
  assert.equal(proposalValidationIssue("У Вас є досвід та команда для цього проєкту?", "uk"), "irrelevant_client_qualification_question");
  assert.equal(proposalValidationIssue("Do you have experience with EMR systems?", "en"), "irrelevant_client_qualification_question");
  assert.equal(proposalValidationIssue("Could you clarify the required EMR integrations and project priorities?", "en"), null);
});

test("proposal drafts limit clarification to three concise questions", () => {
  assert.equal(proposalValidationIssue("Вітаю! Які модулі потрібні? Який строк? Який бюджет? Які інтеграції? Які навантаження?", "uk"), "too_many_clarifying_questions");
  assert.equal(proposalValidationIssue("Could you share the required integrations, timeline, and budget?", "en"), null);
  assert.equal(proposalValidationIssue("¿Podría indicar el plazo y el presupuesto?", "es"), null);
});

test("proposal drafts cannot claim technologies missing from the user's profile", () => {
  assert.equal(proposalValidationIssue("Я можу інтегрувати PHP-код у цей сайт.", "uk", ["HTML", "CSS", "JavaScript"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("I can build this with PHP.", "en", ["PHP", "JavaScript"]), null);
  assert.equal(proposalValidationIssue("I can adapt the OpenCart admin panel.", "en", ["HTML", "CSS"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("Мої навички включають UML і BPMN.", "uk", ["Python", "SQL"]), "unsupported_skill");
  assert.equal(proposalValidationIssue("I wrote a pytest suite for a medical bot.", "en", ["Python"]), "unsupported_experience");
});

test("safe fallback proposals pass language and formality validation for supported languages", () => {
  for (const language of ["ru", "uk", "en", "es", "fr", "de", "pt", "it", "zh", "ja", "ko", "ar", "hi", "el", "he", "th"]) {
    const draft = safeFallbackProposal(language, true, true);
    assert.ok(draft, `missing fallback for ${language}`);
    assert.equal(proposalValidationIssue(draft, language, []), null, `${language}: ${draft}`);
    if (language !== "ru" && language !== "uk" && language !== "en") {
      assert.equal(detectProjectLanguage(draft), language, `${language}: language detector mismatch for ${draft}`);
    }
  }
});

test("safe fallback asks the missing deadline before the missing budget", () => {
  const draft = safeFallbackProposal("uk", true, true);
  assert.ok(draft);
  assert.ok(draft.indexOf("строк") < draft.indexOf("бюджету"));
  assert.equal(safeFallbackProposal("auto", true, true), null);
});

