import type { ActivityId, AnswerRecord } from "@/quiz/types";

/**
 * Teacher-side (LMS) entities. Questions live in `src/quiz/types.ts`
 * because the game consumes them too; everything that is only about
 * managing a class lives here.
 */

export type Student = {
    id: string;
    name: string;
    /** Free-text class / group, e.g. "4A". Empty when not set. */
    className: string;
    /** Login code the student types to sign in (unique, uppercase). */
    code: string;
    /** Emoji avatar shown in the game HUD and teacher lists. */
    avatar: string;
    createdAt: string;
};

export type QuizAssignment =
    | { mode: "everyone" }
    | { mode: "students"; studentIds: string[] };

export type Quiz = {
    id: string;
    name: string;
    description: string;
    activityId: ActivityId;
    /** Ordered references into the question bank. */
    questionIds: string[];
    shuffleQuestions: boolean;
    /** Draft quizzes are hidden from students. */
    published: boolean;
    assignment: QuizAssignment;
    createdAt: string;
    updatedAt: string;
};

/** One completed play-through of a quiz by a student. */
export type QuizAttempt = {
    id: string;
    quizId: string;
    /** Snapshot so reports survive renames/deletes. */
    quizName: string;
    studentId: string;
    studentName: string;
    activityId: ActivityId;
    startedAt: string;
    completedAt: string;
    total: number;
    correct: number;
    /** 0–100, rounded. */
    score: number;
    records: AnswerRecord[];
};
