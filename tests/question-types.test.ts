import { test } from "node:test";
import assert from "node:assert/strict";
import {
    draftFromQuestion,
    emptyDraft,
    questionFromDraft,
    sanitizeQuestion,
    validateDraft,
} from "../src/quiz/question-types";

const NOW = "2026-01-01T00:00:00.000Z";

/** A draft that passes every label rule (grade, subject, topic, curriculum). */
const LABELLED = { grade: 4, subject: "Mathematics", topic: "Fractions", curriculum: "merdeka" as const };

test("validation catches missing text, options and answers", () => {
    const mc = emptyDraft("multiple_choice");
    assert.ok(validateDraft(mc).length >= 2); // no text, no options

    const sa = { ...emptyDraft("short_answer"), ...LABELLED, text: "What is 6 × 2?" };
    assert.deepEqual(validateDraft(sa), ["Add at least one accepted answer."]);

    const tf = { ...emptyDraft("true_false"), ...LABELLED, text: "Fish can fly." };
    assert.deepEqual(validateDraft(tf), []);
});

test("multiple choice: empty options are dropped and the correct one is kept", () => {
    const draft = {
        ...emptyDraft("multiple_choice"),
        ...LABELLED,
        text: "Pick C",
        options: ["A", "", "C", "  "],
        correctIndex: 2,
    };
    assert.deepEqual(validateDraft(draft), []);

    const question = questionFromDraft(draft, "q1", NOW);
    assert.equal(question.type, "multiple_choice");
    if (question.type !== "multiple_choice") return;
    assert.deepEqual(question.options, ["A", "C"]);
    assert.equal(question.correctIndex, 1);
});

test("multiple choice: duplicate options are rejected", () => {
    const draft = { ...emptyDraft(), text: "?", options: ["Same", "same "], correctIndex: 0 };
    assert.ok(validateDraft(draft).some((e) => e.includes("different")));
});

test("short answer: accepted answers are trimmed and de-duplicated", () => {
    const draft = {
        ...emptyDraft("short_answer"),
        text: "?",
        acceptedAnswers: [" twelve", "Twelve", "12", ""],
    };
    const question = questionFromDraft(draft, "q2", NOW);
    assert.equal(question.type, "short_answer");
    if (question.type !== "short_answer") return;
    assert.deepEqual(question.acceptedAnswers, ["twelve", "12"]);
});

test("switching type in the editor keeps every field (round trip)", () => {
    const question = questionFromDraft(
        { ...emptyDraft("true_false"), text: "Sky is blue", correctAnswer: true, subject: "Science" },
        "q3",
        NOW
    );
    const draft = draftFromQuestion(question);
    assert.equal(draft.type, "true_false");
    assert.equal(draft.subject, "Science");
    assert.equal(draft.correctAnswer, true);
});

test("legacy multiple-choice questions without a type are upgraded", () => {
    const legacy = { id: "bank-1", text: "7 + 5?", options: ["10", "12"], correctIndex: 1, subject: "Math" };
    const question = sanitizeQuestion(legacy);
    assert.equal(question?.type, "multiple_choice");
    assert.equal(sanitizeQuestion({ id: "x", text: "broken", options: ["only one"], correctIndex: 0 }), null);
    assert.equal(sanitizeQuestion({ id: "y", text: "?", type: "short_answer", acceptedAnswers: [] }), null);
    assert.equal(sanitizeQuestion(null), null);
});
