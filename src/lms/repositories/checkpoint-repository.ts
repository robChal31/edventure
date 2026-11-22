import { sanitizeQuestion } from "@/quiz/question-types";
import { sanitizeProgress, type ActivityProgress } from "@/quiz/progress";
import type { PlayableQuiz } from "@/quiz/types";
import { createLocalCollection } from "../storage/local-collection";

export type QuizCheckpoint = {
    id: string;
    version: 1;
    studentId: string;
    runId: string;
    startedAt: string;
    savedAt: string;
    /** Stable question snapshots AND order, even when the teacher later edits/shuffles the quiz. */
    quiz: PlayableQuiz;
    progress: ActivityProgress;
};
export function checkpointId(studentId: string, quizId: string): string { return JSON.stringify([studentId, quizId]); }

export function sanitizeCheckpoint(raw: unknown): QuizCheckpoint | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (value.version !== 1 || typeof value.studentId !== "string" || !value.studentId || typeof value.runId !== "string" || !value.runId ||
        typeof value.startedAt !== "string" || !Number.isFinite(Date.parse(value.startedAt)) ||
        typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt)) || !value.quiz || typeof value.quiz !== "object") return null;
    const rawQuiz = value.quiz as Record<string, unknown>;
    if (typeof rawQuiz.id !== "string" || !rawQuiz.id || typeof rawQuiz.name !== "string" ||
        (rawQuiz.activityId !== "fishing" && rawQuiz.activityId !== "catching_bugs" && rawQuiz.activityId !== "forest_serenade") ||
        !Array.isArray(rawQuiz.questions) || rawQuiz.questions.length === 0 || rawQuiz.questions.length > 2000 ||
        (rawQuiz.mode !== undefined && rawQuiz.mode !== "practice" && rawQuiz.mode !== "assessment")) return null;
    const questions = rawQuiz.questions.map(sanitizeQuestion);
    if (questions.some((question, index) => question === null || (rawQuiz.questions as { image?: unknown }[])[index]?.image && !question.image)) return null;
    const quiz: PlayableQuiz = { id: rawQuiz.id, name: rawQuiz.name, activityId: rawQuiz.activityId,
        ...(rawQuiz.mode ? { mode: rawQuiz.mode } : {}), questions: questions.filter((q) => q !== null) };
    const progress = sanitizeProgress(value.progress, quiz.questions);
    if (!progress) return null;
    return { id: checkpointId(value.studentId, quiz.id), version: 1, studentId: value.studentId, runId: value.runId,
        startedAt: value.startedAt, savedAt: value.savedAt, quiz, progress };
}

export const checkpointStore = createLocalCollection<QuizCheckpoint>({
    key: "learning-world.lms.checkpoints.v1", sanitize: sanitizeCheckpoint, requirePersistence: true,
});
export function saveCheckpoint(input: Omit<QuizCheckpoint, "id" | "version" | "savedAt">): QuizCheckpoint {
    const checkpoint: QuizCheckpoint = { ...input, id: checkpointId(input.studentId, input.quiz.id), version: 1, savedAt: new Date().toISOString() };
    return checkpointStore.upsert(checkpoint);
}
/** A stale tab/animation must never erase a newer run's checkpoint. */
export function removeCheckpoint(studentId: string, quizId: string, runId?: string): void {
    const id = checkpointId(studentId, quizId);
    if (!runId || checkpointStore.get(id)?.runId === runId) checkpointStore.remove(id);
}
