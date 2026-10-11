import { gradeAnswer } from "./grading";
import type {
    AnswerRecord,
    AnswerValue,
    PlayableQuiz,
    Question,
    QuizSummary,
} from "./types";

export type AnswerOutcome = {
    question: Question;
    answer: AnswerValue;
    correct: boolean;
    isLast: boolean;
};

/**
 * Tracks a single play-through of a quiz.
 *
 * The session is deliberately activity-agnostic: it owns question order,
 * one-attempt-per-question validation, grading, scoring, and completion.
 * An activity (e.g. fishing) drives presentation/animation and reports the
 * student's answer via {@link submitAnswer}.
 */
export class QuizSession {
    private quiz: PlayableQuiz;
    private index = 0;
    private records: AnswerRecord[] = [];

    constructor(quiz: PlayableQuiz) {
        this.quiz = quiz;
    }

    public get total(): number {
        return this.quiz.questions.length;
    }

    /** 1-based position for progress displays ("Question 3 of 10"). */
    public get currentNumber(): number {
        return Math.min(this.index + 1, this.total);
    }

    public get currentQuestion(): Question | null {
        return this.quiz.questions[this.index] ?? null;
    }

    public get correctCount(): number {
        return this.records.filter((r) => r.correct).length;
    }

    public get incorrectCount(): number {
        return this.records.length - this.correctCount;
    }

    public get answeredCount(): number {
        return this.records.length;
    }

    public get isComplete(): boolean {
        return this.records.length >= this.total;
    }

    /**
     * Grades and records an answer for the current question, then advances.
     * Each question may be answered only once; once the session is
     * complete further submissions are ignored.
     */
    public submitAnswer(answer: AnswerValue): AnswerOutcome | null {
        if (this.isComplete) {
            return null;
        }

        const question = this.currentQuestion;
        if (!question) {
            return null;
        }

        const correct = gradeAnswer(question, answer);

        this.records.push({ question, answer, correct });

        const isLast = this.isComplete;
        this.index += 1;

        return { question, answer, correct, isLast };
    }

    public summary(): QuizSummary {
        return {
            quizId: this.quiz.id,
            quizName: this.quiz.name,
            activityId: this.quiz.activityId,
            total: this.total,
            correct: this.correctCount,
            incorrect: this.incorrectCount,
            records: [...this.records],
        };
    }
}
