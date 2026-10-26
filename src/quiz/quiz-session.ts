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
 * Activity-agnostic question snapshots, grading and final scores.
 * Sequential activities use submitAnswer; activities with spatial targets can
 * submit a specific question without changing its identity or answering twice.
 */
export class QuizSession {
    private quiz: PlayableQuiz;
    private index = 0;
    private records = new Map<number, AnswerRecord>();

    constructor(quiz: PlayableQuiz) {
        this.quiz = quiz;
    }

    public get total(): number {
        return this.quiz.questions.length;
    }

    /** 1-based position of the first unresolved question. */
    public get currentNumber(): number {
        return Math.min(this.index + 1, this.total);
    }

    public get currentQuestion(): Question | null {
        return this.quiz.questions[this.index] ?? null;
    }

    public get correctCount(): number {
        return Array.from(this.records.values()).filter((record) => record.correct).length;
    }

    public get incorrectCount(): number {
        return this.records.size - this.correctCount;
    }

    public get answeredCount(): number {
        return this.records.size;
    }

    public get isComplete(): boolean {
        return this.records.size >= this.total;
    }

    public hasAnswered(questionIndex: number): boolean {
        return this.records.has(questionIndex);
    }

    /** Grades the current question once, then advances (the default behaviour). */
    public submitAnswer(answer: AnswerValue): AnswerOutcome | null {
        return this.submitAnswerFor(this.index, answer);
    }

    /**
     * Grades a particular target's question, in any order. With retryIncorrect,
     * a wrong practice attempt returns feedback but leaves the question open;
     * only its eventual final answer contributes to the score and records.
     * Omit the option for the usual one-attempt-per-question assessment.
     */
    public submitAnswerFor(
        questionIndex: number,
        answer: AnswerValue,
        { retryIncorrect = false }: { retryIncorrect?: boolean } = {}
    ): AnswerOutcome | null {
        if (
            this.isComplete ||
            !Number.isInteger(questionIndex) ||
            questionIndex < 0 ||
            this.hasAnswered(questionIndex)
        ) {
            return null;
        }

        const question = this.quiz.questions[questionIndex];
        if (!question) return null;

        const correct = gradeAnswer(question, answer);
        if (correct || !retryIncorrect) {
            this.records.set(questionIndex, { question, answer, correct });
            while (this.hasAnswered(this.index)) this.index += 1;
        }

        return { question, answer, correct, isLast: this.isComplete };
    }

    public summary(): QuizSummary {
        return {
            quizId: this.quiz.id,
            quizName: this.quiz.name,
            activityId: this.quiz.activityId,
            total: this.total,
            correct: this.correctCount,
            incorrect: this.incorrectCount,
            // Reports use authored play order, even when targets were caught out of order.
            records: Array.from(this.records.entries())
                .sort(([a], [b]) => a - b)
                .map(([, record]) => record),
        };
    }
}
