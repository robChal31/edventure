import { QuizSession, type AnswerOutcome } from "@/quiz/quiz-session";
import { gradeAnswer } from "@/quiz/grading";
import type { ActivityProgress } from "@/quiz/progress";
import type { AnswerValue, PlayableQuiz, QuizSummary } from "@/quiz/types";

export type SerenadeOutcome = AnswerOutcome & { retryable: boolean; frogIndex: number | null };

/** Academic completion never depends on frog count, music, movement or animation. */
export class SerenadeSession {
    readonly quiz: QuizSession;
    readonly mode: "assessment" | "practice";
    #misses: number;
    constructor(private source: PlayableQuiz, progress?: ActivityProgress) {
        this.quiz = new QuizSession(source, progress?.quiz);
        this.mode = source.mode ?? "assessment";
        this.#misses = Math.max(this.quiz.incorrectCount, progress?.misses ?? 0);
    }
    answer(answer: AnswerValue): SerenadeOutcome | null {
        const index = this.quiz.currentNumber - 1;
        const result = this.quiz.submitAnswerFor(index, answer, { retryIncorrect: this.mode === "practice" });
        if (!result) return null;
        if (!result.correct) this.#misses += 1;
        return { ...result, retryable: !result.correct && this.mode === "practice", frogIndex: result.correct ? index : null };
    }
    /** Restore success by question index, including gaps after wrong assessment answers. */
    get befriendedQuestions(): number[] {
        return this.quiz.snapshot().answers.filter(({ questionIndex, answer }) => gradeAnswer(this.source.questions[questionIndex], answer))
            .map(({ questionIndex }) => questionIndex);
    }
    get misses(): number { return this.#misses; }
    snapshot(): ActivityProgress { return { quiz: this.quiz.snapshot(), misses: this.#misses }; }
    summary(): QuizSummary { return { ...this.quiz.summary(), mode: this.mode, misses: this.#misses }; }
}
