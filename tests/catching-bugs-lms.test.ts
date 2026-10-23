import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { ensureLmsMigrated } from "../src/lms/migrations";
import { attemptStore, recordAttempt } from "../src/lms/repositories/attempt-repository";
import { draftFromQuiz, emptyQuizDraft, quizStore, saveQuiz } from "../src/lms/repositories/quiz-repository";
import { resolveQuizQuestions, toPlayableQuiz } from "../src/lms/services/playable-quiz";
import { seedQuestions, seedQuizzes } from "../src/lms/seed";
import type { QuizSummary, Question } from "../src/quiz/types";

const question: Question = {
    id: "any-subject", type: "short_answer", text: "Lawan kata panas?", acceptedAnswers: ["dingin"],
};
const rawQuiz = {
    id: "existing-bugs", name: "Teacher's bugs quiz", description: "My own content",
    activityId: "catching_bugs", mode: "practice", questionIds: [question.id],
    shuffleQuestions: false, published: true, assignment: { mode: "everyone" },
    schoolId: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
const fishingQuiz = { ...rawQuiz, id: "existing-fishing", activityId: "fishing", mode: undefined };
const summary: QuizSummary = {
    quizId: rawQuiz.id, quizName: rawQuiz.name, activityId: "catching_bugs", mode: "practice", misses: 3,
    total: 1, correct: 1, incorrect: 0,
    records: [{ question, answer: { type: "short_answer", text: "dingin" }, correct: true }],
};
const data = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

before(() => {
    data.set("learning-world.lms.migration.v2", "already migrated");
    data.set("learning-world.lms.quizzes.v1", JSON.stringify([rawQuiz, fishingQuiz]));
    data.set("learning-world.lms.attempts.v1", JSON.stringify([
        {
            id: "stored-bugs", quizId: summary.quizId, quizName: summary.quizName,
            studentId: "ani", studentName: "Ani", activityId: "catching_bugs", mode: "practice", misses: 3,
            startedAt: "2026-01-01", completedAt: "2026-01-01", total: 1, records: summary.records,
        },
        {
            id: "legacy", quizId: "old", studentId: "ani", records: summary.records,
            activityId: "unknown-legacy", mode: "invalid", misses: -1,
        },
    ]));
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key: string) => data.get(key) ?? null,
                setItem: (key: string, value: string) => data.set(key, value),
            },
        },
    });
});

after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
});

test("bugs LMS: stored activity/mode survives sanitation and the playable snapshot", () => {
    const quiz = quizStore.get(rawQuiz.id)!;
    assert.equal(quiz.activityId, "catching_bugs");
    assert.equal(quiz.mode, "practice");
    const playable = toPlayableQuiz(quiz, [question]);
    assert.equal(playable.mode, "practice");
    assert.equal(playable.activityId, "catching_bugs");
    assert.deepEqual(playable.questions, [question]);
    assert.equal(draftFromQuiz(quiz).mode, "practice");
    assert.equal(toPlayableQuiz(quizStore.get("existing-fishing")!, [question]).mode, undefined);
});

test("bugs LMS: editor saves both modes; fishing's saved format stays unchanged", () => {
    const draft = { ...emptyQuizDraft(), name: "Assessment", activityId: "catching_bugs" as const, questionIds: [question.id] };
    const quiz = saveQuiz(draft);
    assert.equal(quiz.mode, "assessment");
    const updated = saveQuiz({ ...draftFromQuiz(quiz), mode: "practice" });
    assert.equal(updated.mode, "practice");
    const stored = JSON.parse(data.get("learning-world.lms.quizzes.v1")!);
    assert.equal(stored.find((item: { id: string }) => item.id === updated.id).mode, "practice");
    const fishing = saveQuiz({ ...draft, activityId: "fishing" });
    assert.equal(Object.hasOwn(fishing, "mode"), false);
});

test("bugs LMS: attempts preserve activity, final scores, mode and retry misses after loading", () => {
    const loaded = attemptStore.get("stored-bugs")!;
    assert.equal(loaded.activityId, "catching_bugs");
    assert.equal(loaded.mode, "practice");
    assert.equal(loaded.misses, 3);
    assert.equal(loaded.score, 100);
    const legacy = attemptStore.get("legacy")!;
    assert.equal(legacy.activityId, "fishing");
    assert.equal(legacy.mode, undefined);
    assert.equal(legacy.misses, undefined);
    const recorded = recordAttempt({ student: { id: "ani", name: "Ani" }, summary, startedAt: "2026-01-01" });
    assert.equal(recorded.mode, "practice");
    assert.equal(recorded.misses, 3);
    const stored = JSON.parse(data.get("learning-world.lms.attempts.v1")!);
    assert.equal(stored.find((item: { id: string }) => item.id === recorded.id).activityId, "catching_bugs");
});

test("bugs LMS: new demo uses real mixed-subject questions, not gameplay-specific question data", () => {
    const demo = seedQuizzes().find((quiz) => quiz.activityId === "catching_bugs")!;
    const questions = resolveQuizQuestions(demo, seedQuestions());
    assert.equal(demo.mode, "practice");
    assert.equal(questions.length, 7);
    assert.equal(new Set(questions.map((item) => item.type)).size, 3);
    assert.ok(new Set(questions.map((item) => item.subject)).size > 1);
});

test("bugs LMS: incremental demo migration does not re-seed or overwrite fishing", () => {
    const before = quizStore.get("existing-fishing");
    assert.equal(ensureLmsMigrated(), true);
    assert.ok(quizStore.get("quiz-sample-catching-bugs"));
    assert.deepEqual(quizStore.get("existing-fishing"), before);
    assert.equal(quizStore.get("quiz-sample-ocean"), undefined);
    assert.ok(data.has("learning-world.lms.catching-bugs-sample.v1"));
    // A deliberately deleted demo is not resurrected on every visit.
    quizStore.remove("quiz-sample-catching-bugs");
    ensureLmsMigrated();
    assert.equal(quizStore.get("quiz-sample-catching-bugs"), undefined);
});
