/**
 * Core domain types for Learning World quizzes.
 *
 * These types are intentionally free of any Phaser / activity-specific
 * concerns so that the question model can be reused by future activities
 * (fishing is only the first one) and by the teacher LMS.
 */

import type {
    CognitiveLevel,
    CurriculumId,
    Difficulty,
} from "./taxonomy";

/** Activities (games/maps) a quiz can be played in. See `./activities.ts`. */
export type ActivityId = "fishing";

// ─────────────────────────────────────────
// QUESTIONS
// ─────────────────────────────────────────

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

/**
 * Labels that describe what a question is about. Used for filtering,
 * searching and reporting. See `src/quiz/taxonomy.ts` for the value lists.
 */
export type Classification = {
    /** Grade the question is written for (1–12). */
    grade?: number;
    subject?: string;
    /** Free text, e.g. "Fractions" or "Food chains". */
    topic?: string;
    curriculum?: CurriculumId;
    difficulty?: Difficulty;
    cognitiveLevel?: CognitiveLevel;
    /** Lowercase search tags. */
    tags?: string[];
};

type QuestionBase = Classification & {
    id: string;
    /** The prompt shown to the student. */
    text: string;
    /** Optional "why" shown to the student after they answer. */
    explanation?: string;
    /**
     * Owner: `null` = the global bank (super admin, premade content),
     * a school id = that school's own question. `undefined` only for
     * data created before schools existed (migrated on load).
     */
    schoolId?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type MultipleChoiceQuestion = QuestionBase & {
    type: "multiple_choice";
    options: string[];
    correctIndex: number;
};

export type TrueFalseQuestion = QuestionBase & {
    type: "true_false";
    correctAnswer: boolean;
};

export type ShortAnswerQuestion = QuestionBase & {
    type: "short_answer";
    /** Every answer that should be graded as correct. */
    acceptedAnswers: string[];
    /** Strict mode: compare case and accents exactly. */
    caseSensitive?: boolean;
};

export type Question =
    | MultipleChoiceQuestion
    | TrueFalseQuestion
    | ShortAnswerQuestion;

// ─────────────────────────────────────────
// ANSWERS
// ─────────────────────────────────────────

export type MultipleChoiceAnswer = {
    type: "multiple_choice";
    choiceIndex: number;
};

export type TrueFalseAnswer = {
    type: "true_false";
    value: boolean;
};

export type ShortAnswerAnswer = {
    type: "short_answer";
    text: string;
};

export type AnswerValue =
    | MultipleChoiceAnswer
    | TrueFalseAnswer
    | ShortAnswerAnswer;

// ─────────────────────────────────────────
// PLAY
// ─────────────────────────────────────────

/**
 * A quiz resolved for play: the question snapshots in play order.
 * Built from a teacher's quiz (see `src/lms/services/playable-quiz.ts`).
 */
export type PlayableQuiz = {
    id: string;
    name: string;
    activityId: ActivityId;
    questions: Question[];
};

/** A single answered question within a session. */
export type AnswerRecord = {
    /** Snapshot of the question as it was answered. */
    question: Question;
    answer: AnswerValue;
    correct: boolean;
};

export type QuizSummary = {
    quizId: string;
    quizName: string;
    activityId: ActivityId;
    total: number;
    correct: number;
    incorrect: number;
    records: AnswerRecord[];
};
