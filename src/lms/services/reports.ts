import { describeAnswer } from "@/quiz/grading";
import type { Question, QuestionType } from "@/quiz/types";
import { isQuizAssignedTo } from "../repositories/quiz-repository";
import type { Quiz, QuizAttempt, Student } from "../types";

/**
 * Pure report calculations for the teacher LMS. No storage access —
 * pass in the collections, get plain data back.
 */

export type AttemptStats = {
    count: number;
    averageScore: number | null;
    bestScore: number | null;
    lastCompletedAt: string | null;
};

export function attemptStats(attempts: readonly QuizAttempt[]): AttemptStats {
    if (attempts.length === 0) {
        return { count: 0, averageScore: null, bestScore: null, lastCompletedAt: null };
    }

    const total = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const last = attempts.reduce((latest, attempt) =>
        attempt.completedAt > latest.completedAt ? attempt : latest
    );

    return {
        count: attempts.length,
        averageScore: Math.round(total / attempts.length),
        bestScore: Math.max(...attempts.map((attempt) => attempt.score)),
        lastCompletedAt: last.completedAt,
    };
}

export function sortByNewest(attempts: readonly QuizAttempt[]): QuizAttempt[] {
    return attempts
        .slice()
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export type QuizProgress = {
    quizId: string;
    quizName: string;
    count: number;
    best: QuizAttempt;
    latest: QuizAttempt;
};

/** Best + latest attempt per quiz (for one student's attempts). */
export function progressByQuiz(attempts: readonly QuizAttempt[]): Map<string, QuizProgress> {
    const progress = new Map<string, QuizProgress>();

    attempts.forEach((attempt) => {
        const current = progress.get(attempt.quizId);
        if (!current) {
            progress.set(attempt.quizId, {
                quizId: attempt.quizId,
                quizName: attempt.quizName,
                count: 1,
                best: attempt,
                latest: attempt,
            });
            return;
        }

        current.count += 1;
        if (attempt.score > current.best.score) current.best = attempt;
        if (attempt.completedAt > current.latest.completedAt) {
            current.latest = attempt;
            current.quizName = attempt.quizName;
        }
    });

    return progress;
}

export type TypeAccuracy = Record<QuestionType, { answered: number; correct: number }>;

export function accuracyByType(attempts: readonly QuizAttempt[]): TypeAccuracy {
    const result: TypeAccuracy = {
        multiple_choice: { answered: 0, correct: 0 },
        true_false: { answered: 0, correct: 0 },
        short_answer: { answered: 0, correct: 0 },
    };

    attempts.forEach((attempt) => {
        attempt.records.forEach((record) => {
            const bucket = result[record.question.type];
            bucket.answered += 1;
            if (record.correct) bucket.correct += 1;
        });
    });

    return result;
}

export type QuestionBreakdown = {
    questionId: string;
    question: Question;
    answered: number;
    correct: number;
    /** 0–100 */
    correctRate: number;
    /** Most frequent wrong answer, useful to spot misconceptions. */
    commonWrongAnswer: { label: string; count: number } | null;
};

/** Per-question correctness across attempts, hardest first. */
export function questionBreakdown(attempts: readonly QuizAttempt[]): QuestionBreakdown[] {
    const rows = new Map<
        string,
        {
            question: Question;
            answered: number;
            correct: number;
            /** Grouped case-insensitively, shown as first written. */
            wrong: Map<string, { label: string; count: number }>;
        }
    >();

    sortByNewest(attempts)
        .reverse()
        .forEach((attempt) => {
            attempt.records.forEach((record) => {
                const id = record.question.id;
                const row = rows.get(id) ?? {
                    question: record.question,
                    answered: 0,
                    correct: 0,
                    wrong: new Map<string, { label: string; count: number }>(),
                };
                // Keep the most recent snapshot of the question text.
                row.question = record.question;
                row.answered += 1;

                if (record.correct) {
                    row.correct += 1;
                } else {
                    const label = describeAnswer(record.question, record.answer).trim();
                    const key = label.toLowerCase();
                    const entry = row.wrong.get(key) ?? { label, count: 0 };
                    entry.count += 1;
                    row.wrong.set(key, entry);
                }

                rows.set(id, row);
            });
        });

    return Array.from(rows.entries())
        .map(([questionId, row]) => {
            let commonWrongAnswer: QuestionBreakdown["commonWrongAnswer"] = null;
            row.wrong.forEach((entry) => {
                if (!commonWrongAnswer || entry.count > commonWrongAnswer.count) {
                    commonWrongAnswer = { label: entry.label, count: entry.count };
                }
            });

            return {
                questionId,
                question: row.question,
                answered: row.answered,
                correct: row.correct,
                correctRate: Math.round((row.correct / row.answered) * 100),
                commonWrongAnswer,
            };
        })
        .sort((a, b) => a.correctRate - b.correctRate);
}

export type QuizStudentRow = {
    student: Student;
    attempts: number;
    bestScore: number | null;
    latest: QuizAttempt | null;
};

/** One row per assigned student (plus anyone who played it anyway). */
export function studentRowsForQuiz(
    quiz: Quiz,
    students: readonly Student[],
    attempts: readonly QuizAttempt[]
): QuizStudentRow[] {
    const quizAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);

    return students
        .filter(
            (student) =>
                isQuizAssignedTo(quiz, student.id) ||
                quizAttempts.some((attempt) => attempt.studentId === student.id)
        )
        .map((student) => {
            const own = quizAttempts.filter((attempt) => attempt.studentId === student.id);
            const newest = sortByNewest(own)[0] ?? null;
            return {
                student,
                attempts: own.length,
                bestScore: own.length ? Math.max(...own.map((a) => a.score)) : null,
                latest: newest,
            };
        })
        .sort(
            (a, b) =>
                (b.bestScore ?? -1) - (a.bestScore ?? -1) ||
                a.student.name.localeCompare(b.student.name)
        );
}

export function completionForQuiz(
    quiz: Quiz,
    students: readonly Student[],
    attempts: readonly QuizAttempt[]
): { assigned: number; completed: number } {
    const assigned = students.filter((student) => isQuizAssignedTo(quiz, student.id));
    const completedIds = new Set(
        attempts.filter((a) => a.quizId === quiz.id).map((a) => a.studentId)
    );
    return {
        assigned: assigned.length,
        completed: assigned.filter((student) => completedIds.has(student.id)).length,
    };
}

// ─────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────

export function formatScore(score: number | null): string {
    return score === null ? "—" : `${score}%`;
}

export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatRelative(iso: string | null, now: number = Date.now()): string {
    if (!iso) return "never";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "—";

    const seconds = Math.round((now - then) / 1000);
    if (seconds < 45) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} d ago`;
    return formatDateTime(iso);
}

export function formatDuration(fromIso: string, toIso: string): string {
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "—";
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
