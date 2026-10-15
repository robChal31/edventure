import { test } from "node:test";
import assert from "node:assert/strict";
import {
    describeAnswer,
    describeCorrectAnswer,
    gradeAnswer,
    isShortAnswerCorrect,
    normalizeShortAnswer,
} from "../src/quiz/grading";
import type { Question } from "../src/quiz/types";

test("short answers ignore case, spacing, accents and edge punctuation", () => {
    assert.equal(normalizeShortAnswer("  The   Pacific  Ocean!! "), "the pacific ocean");
    assert.equal(normalizeShortAnswer("Café"), "cafe");
    assert.equal(normalizeShortAnswer('"Mars."'), "mars");
    assert.ok(isShortAnswerCorrect("PACIFIC", ["pacific"]));
    assert.ok(isShortAnswerCorrect("crab", ["a crab", "crab"]));
    assert.ok(!isShortAnswerCorrect("crabs", ["crab"]));
});

test("strict short answers keep case and accents", () => {
    assert.ok(isShortAnswerCorrect("Jakarta", ["Jakarta"], true));
    assert.ok(!isShortAnswerCorrect("jakarta", ["Jakarta"], true));
    assert.ok(!isShortAnswerCorrect("Cafe", ["Café"], true));
});

test("numbers match by value", () => {
    assert.ok(isShortAnswerCorrect("12.0", ["12"]));
    assert.ok(isShortAnswerCorrect("012", ["12"]));
    assert.ok(!isShortAnswerCorrect("12.5", ["12"]));
});

test("blank answers are never correct", () => {
    assert.ok(!isShortAnswerCorrect("   ", ["", " "]));
    assert.ok(!isShortAnswerCorrect("", ["anything"]));
});

test("gradeAnswer handles every type and rejects mismatched answer types", () => {
    const mc: Question = { id: "1", type: "multiple_choice", text: "?", options: ["a", "b"], correctIndex: 1 };
    const tf: Question = { id: "2", type: "true_false", text: "?", correctAnswer: true };
    const sa: Question = { id: "3", type: "short_answer", text: "?", acceptedAnswers: ["12", "twelve"] };

    assert.equal(gradeAnswer(mc, { type: "multiple_choice", choiceIndex: 1 }), true);
    assert.equal(gradeAnswer(mc, { type: "multiple_choice", choiceIndex: 0 }), false);
    assert.equal(gradeAnswer(tf, { type: "true_false", value: true }), true);
    assert.equal(gradeAnswer(tf, { type: "true_false", value: false }), false);
    assert.equal(gradeAnswer(sa, { type: "short_answer", text: "Twelve" }), true);

    assert.equal(gradeAnswer(mc, { type: "true_false", value: true }), false);
    assert.equal(gradeAnswer(tf, { type: "short_answer", text: "true" }), false);
});

test("describe helpers produce readable text", () => {
    const mc: Question = { id: "1", type: "multiple_choice", text: "?", options: ["Venus", "Mars"], correctIndex: 1 };
    const sa: Question = { id: "3", type: "short_answer", text: "?", acceptedAnswers: ["12", " twelve "] };

    assert.equal(describeAnswer(mc, { type: "multiple_choice", choiceIndex: 0 }), "Venus");
    assert.equal(describeCorrectAnswer(mc), "Mars");
    assert.equal(describeCorrectAnswer(sa), "12 / twelve");
    assert.equal(describeAnswer(sa, { type: "short_answer", text: "  " }), "(no answer)");
    assert.equal(
        describeCorrectAnswer({ id: "2", type: "true_false", text: "?", correctAnswer: false }),
        "False"
    );
});
