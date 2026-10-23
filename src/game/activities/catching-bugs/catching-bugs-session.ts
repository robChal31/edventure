import { QuizSession, type AnswerOutcome } from "@/quiz/quiz-session";
import type { AnswerValue, PlayableQuiz, QuizMode, QuizSummary } from "@/quiz/types";

export const CRICKETS_PER_ROUND = 5;

export type BugAnswerOutcome = AnswerOutcome & { retryable: boolean };

/** Pure gameplay rules. No subject, question type, rendering or map-size assumptions. */
export class CatchingBugsSession {
    readonly mode: QuizMode;
    readonly capacity: number;
    readonly quiz: QuizSession;
    #roundIndex = 0;
    #misses = 0;

    constructor(quiz: PlayableQuiz, capacity = CRICKETS_PER_ROUND) {
        if (!Number.isSafeInteger(capacity) || capacity < 1) {
            throw new RangeError("A cricket round needs a positive integer capacity.");
        }
        this.mode = quiz.mode ?? "assessment";
        this.capacity = capacity;
        this.quiz = new QuizSession(quiz);
    }

    get misses(): number {
        return this.#misses;
    }

    get roundCount(): number {
        return Math.ceil(this.quiz.total / this.capacity);
    }

    get roundNumber(): number {
        return this.roundCount === 0 ? 0 : this.#roundIndex + 1;
    }

    /** Stable question indices: a released practice cricket keeps the same question. */
    get questionIndices(): number[] {
        const start = this.#roundIndex * this.capacity;
        const end = Math.min(start + this.capacity, this.quiz.total);
        const indices: number[] = [];
        for (let index = start; index < end; index += 1) {
            if (!this.quiz.hasAnswered(index)) indices.push(index);
        }
        return indices;
    }

    answer(questionIndex: number, answer: AnswerValue): BugAnswerOutcome | null {
        if (!this.questionIndices.includes(questionIndex)) return null;

        const outcome = this.quiz.submitAnswerFor(questionIndex, answer, {
            retryIncorrect: this.mode === "practice",
        });
        if (!outcome) return null;

        if (!outcome.correct) this.#misses += 1;
        return { ...outcome, retryable: !outcome.correct && this.mode === "practice" };
    }

    /** Only open another batch once every cricket in this batch is resolved. */
    advanceRound(): boolean {
        if (this.quiz.isComplete || this.questionIndices.length > 0) return false;
        this.#roundIndex += 1;
        return true;
    }

    summary(): QuizSummary {
        return { ...this.quiz.summary(), mode: this.mode, misses: this.misses };
    }
}
