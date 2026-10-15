import { test } from "node:test";
import assert from "node:assert/strict";
import type { Quiz, QuizAttempt, Student } from "../src/lms/types";
import type { Question } from "../src/quiz/types";
import {
    accuracyByType,
    attemptStats,
    completionForQuiz,
    progressByQuiz,
    questionBreakdown,
    studentRowsForQuiz,
} from "../src/lms/services/reports";
import { questsForStudent, resolveQuizQuestions, toPlayableQuiz } from "../src/lms/services/playable-quiz";
import { attemptsToCsv } from "../src/lms/services/csv";

const mc: Question = { id: "q-mc", type: "multiple_choice", text: "Red planet?", options: ["Venus", "Mars"], correctIndex: 1 };
const tf: Question = { id: "q-tf", type: "true_false", text: "Whales are fish.", correctAnswer: false };
const sa: Question = { id: "q-sa", type: "short_answer", text: "6 × 2?", acceptedAnswers: ["12"] };

const students: Student[] = [
    { id: "s1", name: "Ani", schoolId: "sch-1", classId: "cls-4a", className: "4A", code: "TUNA11", avatar: "🐠", createdAt: "" },
    { id: "s2", name: "Budi", schoolId: "sch-1", classId: "cls-4a", className: "4A", code: "CRAB22", avatar: "🦀", createdAt: "" },
    { id: "s3", name: "Citra", schoolId: "sch-1", classId: "cls-4b", className: "4B", code: "SEAL33", avatar: "🦭", createdAt: "" },
];

function quiz(partial: Partial<Quiz>): Quiz {
    return {
        id: "quiz-1",
        name: "Ocean",
        description: "",
        activityId: "fishing",
        questionIds: ["q-mc", "q-tf", "q-sa"],
        shuffleQuestions: false,
        published: true,
        assignment: { mode: "everyone" },
        createdAt: "",
        updatedAt: "",
        ...partial,
    };
}

function attempt(id: string, studentId: string, answers: { mc: number; tf: boolean; sa: string }, completedAt: string): QuizAttempt {
    const records = [
        { question: mc, answer: { type: "multiple_choice" as const, choiceIndex: answers.mc }, correct: answers.mc === 1 },
        { question: tf, answer: { type: "true_false" as const, value: answers.tf }, correct: answers.tf === false },
        { question: sa, answer: { type: "short_answer" as const, text: answers.sa }, correct: answers.sa === "12" },
    ];
    const correct = records.filter((r) => r.correct).length;
    return {
        id,
        quizId: "quiz-1",
        quizName: "Ocean",
        studentId,
        studentName: students.find((s) => s.id === studentId)!.name,
        activityId: "fishing",
        startedAt: completedAt,
        completedAt,
        total: 3,
        correct,
        score: Math.round((correct / 3) * 100),
        records,
    };
}

const attempts = [
    attempt("a1", "s1", { mc: 1, tf: false, sa: "12" }, "2026-03-01T10:00:00.000Z"), // 100
    attempt("a2", "s1", { mc: 0, tf: false, sa: "11" }, "2026-03-02T10:00:00.000Z"), // 33
    attempt("a3", "s2", { mc: 0, tf: true, sa: "11" }, "2026-03-03T10:00:00.000Z"), // 0
];

test("attempt stats", () => {
    const stats = attemptStats(attempts);
    assert.equal(stats.count, 3);
    assert.equal(stats.averageScore, 44);
    assert.equal(stats.bestScore, 100);
    assert.equal(stats.lastCompletedAt, "2026-03-03T10:00:00.000Z");
    assert.equal(attemptStats([]).averageScore, null);
});

test("progress keeps best and latest attempt per quiz", () => {
    const progress = progressByQuiz(attempts.filter((a) => a.studentId === "s1")).get("quiz-1")!;
    assert.equal(progress.count, 2);
    assert.equal(progress.best.id, "a1");
    assert.equal(progress.latest.id, "a2");
});

test("question breakdown: hardest first with the most common wrong answer", () => {
    const rows = questionBreakdown(attempts);
    assert.equal(rows[0].correctRate <= rows[1].correctRate, true);
    const shortAnswer = rows.find((r) => r.questionId === "q-sa")!;
    assert.equal(shortAnswer.correct, 1);
    assert.deepEqual(shortAnswer.commonWrongAnswer, { label: "11", count: 2 });
    const mcRow = rows.find((r) => r.questionId === "q-mc")!;
    assert.deepEqual(mcRow.commonWrongAnswer, { label: "Venus", count: 2 });
});

test("accuracy per question type", () => {
    const accuracy = accuracyByType(attempts);
    assert.deepEqual(accuracy.multiple_choice, { answered: 3, correct: 1 });
    assert.deepEqual(accuracy.true_false, { answered: 3, correct: 2 });
    assert.deepEqual(accuracy.short_answer, { answered: 3, correct: 1 });
});

test("completion and student rows respect assignments", () => {
    const everyone = quiz({});
    assert.deepEqual(completionForQuiz(everyone, students, attempts), { assigned: 3, completed: 2 });

    const onlyCitra = quiz({ assignment: { mode: "students", studentIds: ["s3"] } });
    assert.deepEqual(completionForQuiz(onlyCitra, students, attempts), { assigned: 1, completed: 0 });
    // Students who played anyway still show up in the quiz report.
    const rows = studentRowsForQuiz(onlyCitra, students, attempts);
    assert.deepEqual(rows.map((r) => r.student.id).sort(), ["s1", "s2", "s3"]);
    assert.equal(rows[0].student.id, "s1"); // best score first
});

test("quests: only published, assigned quizzes with questions", () => {
    const questions = [mc, tf, sa];
    const quizzes = [
        quiz({ id: "pub" }),
        quiz({ id: "draft", published: false }),
        quiz({ id: "other", assignment: { mode: "students", studentIds: ["s2"] } }),
        quiz({ id: "empty", questionIds: ["deleted-question"] }),
    ];
    assert.deepEqual(questsForStudent(students.find((st) => st.id === "s1")!, quizzes, questions).map((q) => q.id), ["pub"]);
    assert.deepEqual(questsForStudent(students.find((st) => st.id === "s2")!, quizzes, questions).map((q) => q.id), ["pub", "other"]);
});

test("playable quiz: missing questions skipped, shuffle uses the given random", () => {
    const questions = [mc, tf, sa];
    const withMissing = quiz({ questionIds: ["q-sa", "gone", "q-mc"] });
    assert.deepEqual(resolveQuizQuestions(withMissing, questions).map((q) => q.id), ["q-sa", "q-mc"]);

    const ordered = toPlayableQuiz(quiz({}), questions);
    assert.deepEqual(ordered.questions.map((q) => q.id), ["q-mc", "q-tf", "q-sa"]);

    const shuffled = toPlayableQuiz(quiz({ shuffleQuestions: true }), questions, () => 0);
    assert.deepEqual(shuffled.questions.map((q) => q.id).sort(), ["q-mc", "q-sa", "q-tf"]);
    assert.notDeepEqual(shuffled.questions.map((q) => q.id), ["q-mc", "q-tf", "q-sa"]);
});

test("CSV export: one row per answer, quoted when needed", () => {
    const csv = attemptsToCsv([attempt("a9", "s1", { mc: 1, tf: false, sa: "12, ok" }, "2026-03-04T10:00:00.000Z")]);
    const lines = csv.split("\n");
    assert.equal(lines.length, 4);
    assert.ok(lines[3].includes('"12, ok"'));
});
