import { test } from "node:test";
import assert from "node:assert/strict";
import { QuizSession } from "../src/quiz/quiz-session";
import type { Quiz } from "../src/quiz/types";

function makeQuiz(n: number): Quiz {
    return {
        id: "t",
        name: "Test",
        activityId: "fishing",
        questions: Array.from({ length: n }, (_, i) => ({
            id: `q${i}`,
            text: `Q${i}?`,
            options: ["a", "b", "c", "d"],
            correctIndex: i % 4,
        })),
    };
}

test("challenge count equals question count", () => {
    const session = new QuizSession(makeQuiz(10));
    assert.equal(session.total, 10);

    // Drive exactly one answer per question.
    let answered = 0;
    while (!session.isComplete) {
        const q = session.currentQuestion!;
        session.submitAnswer(q.correctIndex);
        answered++;
        if (answered > 10) throw new Error("exceeded question count");
    }
    assert.equal(answered, 10);
    assert.equal(session.answeredCount, 10);
});

test("scoring and records", () => {
    const session = new QuizSession(makeQuiz(4));
    // q0 correct=0, q1 correct=1, q2 correct=2, q3 correct=3
    session.submitAnswer(0); // correct
    session.submitAnswer(0); // incorrect (correct is 1)
    session.submitAnswer(2); // correct
    session.submitAnswer(0); // incorrect (correct is 3)

    assert.equal(session.correctCount, 2);
    assert.equal(session.incorrectCount, 2);
    assert.equal(session.answeredCount, 4);

    const summary = session.summary();
    assert.equal(summary.total, 4);
    assert.equal(summary.correct, 2);
    assert.equal(summary.incorrect, 2);
    assert.equal(summary.records.length, 4);
});

test("each question answered only once; complete blocks further answers", () => {
    const session = new QuizSession(makeQuiz(2));
    session.submitAnswer(0);
    session.submitAnswer(0);
    assert.equal(session.isComplete, true);

    const extra = session.submitAnswer(0);
    assert.equal(extra, null);
    assert.equal(session.answeredCount, 2);
});

test("progress numbering", () => {
    const session = new QuizSession(makeQuiz(3));
    assert.equal(session.currentNumber, 1);
    session.submitAnswer(0);
    assert.equal(session.currentNumber, 2);
    session.submitAnswer(0);
    session.submitAnswer(0);
    assert.equal(session.isComplete, true);
});
