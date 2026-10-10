import type {
    AnswerRecord,
    Question,
    Quiz,
    QuizSummary,
} from "./types";

export type AnswerOutcome = {
    question: Question;
    selectedIndex: number;
    correct: boolean;
    isLast: boolean;
};

/**
 * Tracks a single play-through of a quiz.
 *
 * The session is deliberately activity-agnostic: it owns question order,
 * one-attempt-per-question validation, scoring, and completion. An
 * activity (e.g. fishing) drives presentation/animation and reports the
 * student's chosen option via {@link submitAnswer}.
 */
export class QuizSession {
    private quiz: Quiz;
    private index = 0;
    private records: AnswerRecord[] = [];

    constructor(quiz: Quiz) {
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
     * Records an answer for the current question and advances.
     * Each question may be answered only once; once the session is
     * complete further submissions are ignored.
     */
    public submitAnswer(selectedIndex: number): AnswerOutcome | null {
        if (this.isComplete) {
            return null;
        }

        const question = this.currentQuestion;
        if (!question) {
            return null;
        }

        const correct = selectedIndex === question.correctIndex;

        this.records.push({ question, selectedIndex, correct });

        const isLast = this.isComplete;
        this.index += 1;

        return { question, selectedIndex, correct, isLast };
    }

    public summary(): QuizSummary {
        return {
            quizName: this.quiz.name,
            activityId: this.quiz.activityId,
            total: this.total,
            correct: this.correctCount,
            incorrect: this.incorrectCount,
            records: [...this.records],
        };
    }
}
