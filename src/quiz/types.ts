/**
 * Core domain types for Learning World quizzes.
 *
 * These types are intentionally free of any Phaser / activity-specific
 * concerns so that the question model can be reused by future activities
 * (fishing is only the first one).
 */

export type ActivityId = "fishing";

export type Question = {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    subject?: string;
};

export type Quiz = {
    id: string;
    name: string;
    activityId: ActivityId;
    questions: Question[];
};

/** A single answered question within a session. */
export type AnswerRecord = {
    question: Question;
    selectedIndex: number;
    correct: boolean;
};

export type QuizSummary = {
    quizName: string;
    activityId: ActivityId;
    total: number;
    correct: number;
    incorrect: number;
    records: AnswerRecord[];
};
