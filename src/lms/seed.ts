import { SAMPLE_QUESTION_BANK } from "@/quiz/question-bank";
import type { Question } from "@/quiz/types";
import { readLegacyRooms } from "./storage/legacy-rooms";
import type { Quiz, Student } from "./types";

/**
 * First-run content so a fresh install is immediately playable:
 * the sample question bank, two sample quizzes and three demo students.
 * Each collection seeds itself only when its storage key is empty, and
 * teachers can edit or delete everything.
 */

const SEED_DATE = "2026-01-05T08:00:00.000Z";

export function seedQuestions(): Question[] {
    const legacy = readLegacyRooms().questions;
    const ids = new Set(SAMPLE_QUESTION_BANK.map((q) => q.id));
    const imported = legacy.filter((q) => !ids.has(q.id));

    return [...SAMPLE_QUESTION_BANK, ...imported].map((question) => ({
        ...question,
        createdAt: question.createdAt ?? SEED_DATE,
        updatedAt: question.updatedAt ?? SEED_DATE,
    }));
}

export function seedQuizzes(): Quiz[] {
    const samples: Quiz[] = [
        {
            id: "quiz-sample-ocean",
            name: "Ocean Explorers",
            description:
                "A mixed warm-up: multiple choice, true/false and short answers about the sea.",
            activityId: "fishing",
            questionIds: [
                "bank-12",
                "bank-tf-1",
                "bank-sa-3",
                "bank-14",
                "bank-tf-2",
                "bank-9",
            ],
            shuffleQuestions: false,
            published: true,
            assignment: { mode: "everyone" },
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
        },
        {
            id: "quiz-sample-math",
            name: "Quick Math Catch",
            description: "Five fast number questions.",
            activityId: "fishing",
            questionIds: ["bank-1", "bank-sa-1", "bank-tf-3", "bank-2", "bank-13"],
            shuffleQuestions: true,
            published: true,
            assignment: { mode: "everyone" },
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
        },
    ];

    return [...samples, ...readLegacyRooms().quizzes];
}

export function seedStudents(): Student[] {
    return [
        { id: "student-demo-ani", name: "Ani", className: "4A", code: "TUNA11", avatar: "🐠", createdAt: SEED_DATE },
        { id: "student-demo-budi", name: "Budi", className: "4A", code: "CRAB22", avatar: "🦀", createdAt: SEED_DATE },
        { id: "student-demo-citra", name: "Citra", className: "4B", code: "SEAL33", avatar: "🦭", createdAt: SEED_DATE },
    ];
}
