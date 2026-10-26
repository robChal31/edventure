import { ACTIVITIES } from "@/quiz/activities";
import { sanitizeQuestion } from "@/quiz/question-types";
import type { ActivityId, AnswerRecord, AnswerValue, QuizSummary } from "@/quiz/types";
import { createId, nowIso } from "../ids";
import { createLocalCollection } from "../storage/local-collection";
import type { QuizAttempt, Student } from "../types";

function sanitizeAnswer(raw: unknown): AnswerValue | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;

    switch (value.type) {
        case "multiple_choice":
            return typeof value.choiceIndex === "number"
                ? { type: "multiple_choice", choiceIndex: value.choiceIndex }
                : null;
        case "true_false":
            return typeof value.value === "boolean"
                ? { type: "true_false", value: value.value }
                : null;
        case "short_answer":
            return typeof value.text === "string"
                ? { type: "short_answer", text: value.text }
                : null;
        default:
            return null;
    }
}

function sanitizeRecord(raw: unknown): AnswerRecord | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const question = sanitizeQuestion(value.question);
    const answer = sanitizeAnswer(value.answer);
    if (!question || !answer || typeof value.correct !== "boolean") return null;
    return { question, answer, correct: value.correct };
}

function sanitizeAttempt(raw: unknown): QuizAttempt | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;

    if (
        typeof value.id !== "string" ||
        typeof value.quizId !== "string" ||
        typeof value.studentId !== "string" ||
        !Array.isArray(value.records)
    ) {
        return null;
    }

    const records = value.records
        .map((record) => sanitizeRecord(record))
        .filter((record): record is AnswerRecord => record !== null);
    const correct = records.filter((record) => record.correct).length;
    const total = typeof value.total === "number" ? value.total : records.length;

    return {
        id: value.id,
        quizId: value.quizId,
        quizName: typeof value.quizName === "string" ? value.quizName : "Quiz",
        studentId: value.studentId,
        studentName: typeof value.studentName === "string" ? value.studentName : "Student",
        activityId: ACTIVITIES.some((activity) => activity.id === value.activityId)
            ? value.activityId as ActivityId
            : "fishing",
        ...(value.mode === "practice" || value.mode === "assessment" ? { mode: value.mode } : {}),
        ...(typeof value.misses === "number" && Number.isSafeInteger(value.misses) && value.misses >= 0
            ? { misses: value.misses } : {}),
        startedAt: typeof value.startedAt === "string" ? value.startedAt : nowIso(),
        completedAt: typeof value.completedAt === "string" ? value.completedAt : nowIso(),
        total,
        correct,
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        records,
    };
}

export const attemptStore = createLocalCollection<QuizAttempt>({
    key: "learning-world.lms.attempts.v1",
    sanitize: sanitizeAttempt,
});

export function recordAttempt(input: {
    student: Pick<Student, "id" | "name">;
    summary: QuizSummary;
    startedAt: string;
    completedAt?: string;
}): QuizAttempt {
    const { student, summary } = input;
    const total = summary.total;

    return attemptStore.upsert({
        id: createId("attempt"),
        quizId: summary.quizId,
        quizName: summary.quizName,
        studentId: student.id,
        studentName: student.name,
        activityId: summary.activityId,
        ...(summary.mode ? { mode: summary.mode } : {}),
        ...(summary.misses !== undefined ? { misses: summary.misses } : {}),
        startedAt: input.startedAt,
        completedAt: input.completedAt ?? nowIso(),
        total,
        correct: summary.correct,
        score: total > 0 ? Math.round((summary.correct / total) * 100) : 0,
        records: summary.records,
    });
}

export function deleteAttempt(id: string): void {
    attemptStore.remove(id);
}

export function deleteAttemptsForStudent(studentId: string): number {
    return attemptStore.removeWhere((attempt) => attempt.studentId === studentId);
}
