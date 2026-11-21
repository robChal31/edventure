import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { QuizSession } from "../src/quiz/quiz-session";
import { sanitizeProgress } from "../src/quiz/progress";
import { CatchingBugsSession } from "../src/game/activities/catching-bugs/catching-bugs-session";
import { checkpointId, checkpointStore, removeCheckpoint, sanitizeCheckpoint, saveCheckpoint } from "../src/lms/repositories/checkpoint-repository";
import { attemptStore, recordAttempt } from "../src/lms/repositories/attempt-repository";
import { createLocalCollection } from "../src/lms/storage/local-collection";
import type { PlayableQuiz, Question } from "../src/quiz/types";

const questions: Question[] = Array.from({ length: 7 }, (_, index) => ({ id: `q${index}`, type: "short_answer", text: `Question ${index}`, acceptedAnswers: [String(index)] }));
const quiz: PlayableQuiz = { id: "resume-quiz", name: "Keep my order", activityId: "catching_bugs", mode: "assessment", questions };
const answer = (index: number, correct = true) => ({ type: "short_answer" as const, text: correct ? String(index) : "wrong" });
const startedAt = "2026-10-23T08:00:00.000Z";
const data = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
before(() => Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
} } }));
after(() => { if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window"); });

test("resume: out-of-order final answers retain their identity, order and score", () => {
    const first = new QuizSession(quiz);
    first.submitAnswerFor(4, answer(4)); first.submitAnswerFor(0, answer(0, false));
    const resumed = new QuizSession(quiz, JSON.parse(JSON.stringify(first.snapshot())));
    assert.equal(resumed.answeredCount, 2); assert.equal(resumed.correctCount, 1); assert.equal(resumed.currentNumber, 2);
    assert.equal(resumed.submitAnswerFor(4, answer(4)), null);
    assert.deepEqual(resumed.summary().records.map((r) => r.question.id), ["q0", "q4"]);
    assert.deepEqual(resumed.snapshot(), first.snapshot());
});

test("resume: practice misses persist without resolving or replacing the retry question", () => {
    const practice = { ...quiz, mode: "practice" as const };
    const first = new CatchingBugsSession(practice);
    first.answer(3, answer(3, false)); first.answer(0, answer(0));
    const resumed = new CatchingBugsSession(practice, 5, first.snapshot());
    assert.equal(resumed.misses, 1); assert.equal(resumed.quiz.answeredCount, 1);
    assert.deepEqual(resumed.questionIndices, [1, 2, 3, 4]);
    assert.equal(resumed.answer(3, answer(3))?.retryable, false);
    assert.equal(resumed.misses, 1); assert.equal(resumed.quiz.correctCount, 2);
});

test("resume: the next round is derived from academic state, even during a saved transition", () => {
    const first = new CatchingBugsSession(quiz);
    [4, 2, 0, 3, 1].forEach((index) => first.answer(index, answer(index)));
    const resumed = new CatchingBugsSession(quiz, 5, first.snapshot());
    assert.equal(resumed.roundNumber, 2); assert.deepEqual(resumed.questionIndices, [5, 6]);
    assert.equal(resumed.answer(0, answer(0)), null);
});

test("resume: 0% and a checkpoint after the final submit still complete all questions", () => {
    const first = new CatchingBugsSession(quiz);
    for (let index = 0; index < 7; index += 1) { if (index === 5) first.advanceRound(); first.answer(index, answer(index, false)); }
    const resumed = new CatchingBugsSession(quiz, 5, first.snapshot());
    assert.equal(resumed.quiz.isComplete, true); assert.equal(resumed.summary().correct, 0);
    assert.equal(resumed.summary().incorrect, 7); assert.equal(resumed.summary().records.length, 7); assert.equal(resumed.misses, 7);
    assert.equal(resumed.answer(0, answer(0)), null); assert.equal(resumed.advanceRound(), false);
});

test("resume: fishing retains its sequential scoring and resumes at the first unanswered question", () => {
    const fishing = { ...quiz, activityId: "fishing" as const, mode: undefined };
    const first = new QuizSession(fishing); first.submitAnswer(answer(0, false));
    const resumed = new QuizSession(fishing, first.snapshot());
    assert.equal(resumed.currentQuestion?.id, "q1"); assert.equal(resumed.incorrectCount, 1);
    resumed.submitAnswer(answer(1)); assert.equal(resumed.answeredCount, 2);
});

test("checkpoints: stable snapshots survive JSON storage and never depend on newly shuffled questions", () => {
    const first = new QuizSession(quiz); first.submitAnswerFor(4, answer(4));
    const saved = saveCheckpoint({ studentId: "ani", runId: "run-one", startedAt, quiz, progress: { quiz: first.snapshot(), misses: 0 } });
    const restored = sanitizeCheckpoint(JSON.parse(JSON.stringify(saved)))!;
    const newlyShuffled = { ...quiz, questions: [...questions].reverse() };
    assert.notDeepEqual(restored.quiz.questions.map((q) => q.id), newlyShuffled.questions.map((q) => q.id));
    assert.deepEqual(JSON.parse(JSON.stringify(restored.quiz.questions)), quiz.questions);
    assert.equal(new QuizSession(restored.quiz, restored.progress.quiz).hasAnswered(4), true);
    assert.ok(data.get("learning-world.lms.checkpoints.v1")?.includes("run-one"));
    assert.notEqual(checkpointId("a:b", "c"), checkpointId("a", "b:c"));
});

test("checkpoints: a stale run cannot erase a newer checkpoint; owners and quizzes stay separate", () => {
    const progress = { quiz: new QuizSession(quiz).snapshot() };
    saveCheckpoint({ studentId: "ani", runId: "new-run", startedAt, quiz, progress });
    saveCheckpoint({ studentId: "budi", runId: "other-student", startedAt, quiz, progress });
    removeCheckpoint("ani", quiz.id, "old-run");
    assert.equal(checkpointStore.get(checkpointId("ani", quiz.id))?.runId, "new-run");
    removeCheckpoint("ani", quiz.id, "new-run");
    assert.equal(checkpointStore.get(checkpointId("ani", quiz.id)), undefined);
    assert.equal(checkpointStore.get(checkpointId("budi", quiz.id))?.runId, "other-student");
});

test("checkpoints: malformed/duplicate answers and unknown versions are rejected, not silently changed", () => {
    const base = { quiz: { version: 1, answers: [{ questionIndex: 0, answer: answer(0) }] }, misses: 0 };
    assert.ok(sanitizeProgress(base, questions));
    for (const invalid of [
        { ...base, quiz: { ...base.quiz, version: 2 } }, { ...base, misses: -1 },
        { ...base, quiz: { ...base.quiz, answers: [...base.quiz.answers, ...base.quiz.answers] } },
        { ...base, quiz: { ...base.quiz, answers: [{ questionIndex: 7, answer: answer(0) }] } },
        { ...base, quiz: { ...base.quiz, answers: [{ questionIndex: 0, answer: { type: "true_false", value: true } }] } },
    ]) assert.equal(sanitizeProgress(invalid, questions), null);
    assert.equal(sanitizeCheckpoint({ version: 2 }), null);
});

test("resume: one run creates one attempt even if completion is delivered twice after reload", () => {
    const first = new QuizSession({ ...quiz, questions: [questions[0]] }); first.submitAnswer(answer(0));
    const input = { student: { id: "ani", name: "Ani" }, summary: first.summary(), startedAt, runId: "same-completion" };
    const a = recordAttempt(input), b = recordAttempt(input);
    assert.equal(a.id, b.id); assert.equal(a.completedAt, b.completedAt);
    assert.equal(attemptStore.getSnapshot().filter((attempt) => attempt.id === a.id).length, 1);
});

test("storage: a failed strict write is atomic and reports failure instead of pretending to save", () => {
    const collection = createLocalCollection<{ id: string; text: string }>({ key: "strict", sanitize: (raw) => raw as { id: string; text: string }, requirePersistence: true });
    collection.upsert({ id: "q", text: "old" });
    const win = window as unknown as { localStorage: { setItem: (key: string, value: string) => unknown } };
    const write = win.localStorage.setItem;
    win.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    try {
        assert.throws(() => collection.upsert({ id: "q", text: "new with image" }), /QuotaExceededError/);
        assert.equal(collection.get("q")?.text, "old");
    } finally { win.localStorage.setItem = write; }
});


test("attempt durability: quota errors never acknowledge an in-memory result or delete the checkpoint", () => {
    const first = new QuizSession({ ...quiz, questions: [questions[0]] }); first.submitAnswer(answer(0));
    const input = { student: { id: "quota-student", name: "Ani" }, summary: first.summary(), startedAt, runId: "quota-run" };
    saveCheckpoint({ studentId: input.student.id, runId: input.runId, startedAt, quiz, progress: { quiz: first.snapshot() } });
    const persistentCheckpoint = data.get("learning-world.lms.checkpoints.v1");
    const write = window.localStorage.setItem;
    window.localStorage.setItem = (key: string, value: string) => {
        if (key === "learning-world.lms.attempts.v1") throw new Error("QuotaExceededError");
        write(key, value);
    };
    try {
        assert.throws(() => recordAttempt(input), /QuotaExceededError/);
        assert.equal(attemptStore.get(`attempt-${input.student.id}-${input.runId}`), undefined);
        assert.equal(data.get("learning-world.lms.checkpoints.v1"), persistentCheckpoint);
    } finally { window.localStorage.setItem = write; }
    const saved = recordAttempt(input);
    assert.equal(recordAttempt(input).id, saved.id);
    assert.ok(data.get("learning-world.lms.attempts.v1")?.includes(saved.id));
    removeCheckpoint(input.student.id, quiz.id, input.runId);
    assert.equal(checkpointStore.get(checkpointId(input.student.id, quiz.id)), undefined);
});
