import { sanitizeQuestion } from "@/quiz/question-types";
import type { Question } from "@/quiz/types";
import type { Quiz } from "../types";

/**
 * The first prototype stored "quiz rooms" (quiz + embedded multiple-choice
 * questions) under `learning-world.rooms.v1`. When the LMS storage is
 * created for the first time we import those rooms so nothing a teacher
 * already made disappears. The old key is left untouched.
 */

const LEGACY_ROOMS_KEY = "learning-world.rooms.v1";

type LegacyImport = {
    questions: Question[];
    quizzes: Quiz[];
};

let cached: LegacyImport | null = null;

export function readLegacyRooms(): LegacyImport {
    if (cached) return cached;

    const result: LegacyImport = { questions: [], quizzes: [] };
    cached = result;

    if (typeof window === "undefined") return result;

    try {
        const raw = window.localStorage.getItem(LEGACY_ROOMS_KEY);
        if (!raw) return result;

        const rooms: unknown = JSON.parse(raw);
        if (!Array.isArray(rooms)) return result;

        const seenQuestions = new Set<string>();

        rooms.forEach((room: unknown) => {
            if (!room || typeof room !== "object") return;
            const value = room as Record<string, unknown>;
            if (typeof value.id !== "string" || typeof value.name !== "string") {
                return;
            }

            const questions = Array.isArray(value.questions)
                ? value.questions
                      .map((q) => sanitizeQuestion(q))
                      .filter((q): q is Question => q !== null)
                : [];

            if (questions.length === 0) return;

            questions.forEach((question) => {
                if (!seenQuestions.has(question.id)) {
                    seenQuestions.add(question.id);
                    result.questions.push(question);
                }
            });

            const now = new Date().toISOString();
            result.quizzes.push({
                id: value.id,
                name: value.name,
                description: "Imported from an earlier quiz room.",
                activityId: "fishing",
                questionIds: questions.map((q) => q.id),
                shuffleQuestions: false,
                published: true,
                assignment: { mode: "everyone" },
                createdAt: now,
                updatedAt: now,
            });
        });
    } catch {
        // Corrupt legacy data — ignore.
    }

    return result;
}
