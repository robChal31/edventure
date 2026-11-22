import { QuizSession, type AnswerOutcome } from "@/quiz/quiz-session";
import type { ActivityProgress } from "@/quiz/progress";
import type { AnswerValue, PlayableQuiz, QuizSummary } from "@/quiz/types";

export type SerenadeOutcome = AnswerOutcome & { retryable: boolean; frogs: 0 | 1 };

/** Academic completion never depends on frog count, music, movement or animation. */
export class SerenadeSession {
    readonly quiz: QuizSession;
    readonly mode: "assessment" | "practice";
    #misses: number;
    constructor(quiz: PlayableQuiz, progress?: ActivityProgress) {
        this.quiz = new QuizSession(quiz, progress?.quiz);
        this.mode = quiz.mode ?? "assessment";
        this.#misses = Math.max(this.quiz.incorrectCount, progress?.misses ?? 0);
    }
    answer(answer: AnswerValue): SerenadeOutcome | null {
        const index = this.quiz.currentNumber - 1;
        const result = this.quiz.submitAnswerFor(index, answer, { retryIncorrect: this.mode === "practice" });
        if (!result) return null;
        if (!result.correct) this.#misses += 1;
        return { ...result, retryable: !result.correct && this.mode === "practice", frogs: result.correct ? 1 : 0 };
    }
    get misses(): number { return this.#misses; }
    snapshot(): ActivityProgress { return { quiz: this.quiz.snapshot(), misses: this.#misses }; }
    summary(): QuizSummary { return { ...this.quiz.summary(), mode: this.mode, misses: this.#misses }; }
}
