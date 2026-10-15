import { test } from "node:test";
import assert from "node:assert/strict";
import { QuizSession } from "../src/quiz/quiz-session";
import type { AnswerValue, PlayableQuiz, Question } from "../src/quiz/types";

function makeQuiz(n: number): PlayableQuiz {
    return {
        id: "t",
        name: "Test",
        activityId: "fishing",
        questions: Array.from({ length: n }, (_, i) => ({
            id: `q${i}`,
            type: "multiple_choice" as const,
            text: `Q${i}?`,
            options: ["a", "b", "c", "d"],
            correctIndex: i % 4,
        })),
    };
}

const choice = (choiceIndex: number): AnswerValue => ({ type: "multiple_choice", choiceIndex });

test("challenge count equals question count", () => {
    const session = new QuizSession(makeQuiz(10));
    assert.equal(session.total, 10);

    // Drive exactly one answer per question.
    let answered = 0;
    while (!session.isComplete) {
        const q = session.currentQuestion!;
        assert.equal(q.type, "multiple_choice");
        if (q.type === "multiple_choice") session.submitAnswer(choice(q.correctIndex));
        answered++;
        if (answered > 10) throw new Error("exceeded question count");
    }
    assert.equal(answered, 10);
    assert.equal(session.answeredCount, 10);
    assert.equal(session.correctCount, 10);
});

test("scoring and records", () => {
    const session = new QuizSession(makeQuiz(4));
    // q0 correct=0, q1 correct=1, q2 correct=2, q3 correct=3
    session.submitAnswer(choice(0)); // correct
    session.submitAnswer(choice(0)); // incorrect (correct is 1)
    session.submitAnswer(choice(2)); // correct
    session.submitAnswer(choice(0)); // incorrect (correct is 3)

    assert.equal(session.correctCount, 2);
    assert.equal(session.incorrectCount, 2);
    assert.equal(session.answeredCount, 4);

    const summary = session.summary();
    assert.equal(summary.quizId, "t");
    assert.equal(summary.total, 4);
    assert.equal(summary.correct, 2);
    assert.equal(summary.incorrect, 2);
    assert.equal(summary.records.length, 4);
    assert.deepEqual(summary.records[1].answer, choice(0));
});

test("each question answered only once; complete blocks further answers", () => {
    const session = new QuizSession(makeQuiz(2));
    session.submitAnswer(choice(0));
    session.submitAnswer(choice(0));
    assert.equal(session.isComplete, true);

    const extra = session.submitAnswer(choice(0));
    assert.equal(extra, null);
    assert.equal(session.answeredCount, 2);
});

test("progress numbering", () => {
    const session = new QuizSession(makeQuiz(3));
    assert.equal(session.currentNumber, 1);
    session.submitAnswer(choice(0));
    assert.equal(session.currentNumber, 2);
    session.submitAnswer(choice(0));
    session.submitAnswer(choice(0));
    assert.equal(session.isComplete, true);
});

test("mixed question types are graded per type", () => {
    const questions: Question[] = [
        { id: "mc", type: "multiple_choice", text: "?", options: ["x", "y"], correctIndex: 1 },
        { id: "tf", type: "true_false", text: "?", correctAnswer: false },
        { id: "sa", type: "short_answer", text: "?", acceptedAnswers: ["Jakarta"] },
    ];
    const session = new QuizSession({ id: "m", name: "Mixed", activityId: "fishing", questions });

    assert.equal(session.submitAnswer({ type: "multiple_choice", choiceIndex: 1 })?.correct, true);
    assert.equal(session.submitAnswer({ type: "true_false", value: true })?.correct, false);
    const last = session.submitAnswer({ type: "short_answer", text: "  jakarta! " });
    assert.equal(last?.correct, true);
    assert.equal(last?.isLast, true);
    assert.equal(session.correctCount, 2);
});
