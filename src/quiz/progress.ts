import type { AnswerValue, Question } from "./types";

/** Only academic state is persisted. Animations, timers and DOM-close receipts never are. */
export type QuizProgress = {
    version: 1;
    answers: { questionIndex: number; answer: AnswerValue }[];
};
export type ActivityProgress = { quiz: QuizProgress; misses?: number };

export function isAnswerForQuestion(answer: unknown, question: Question): answer is AnswerValue {
    if (!answer || typeof answer !== "object") return false;
    const value = answer as Record<string, unknown>;
    if (value.type !== question.type) return false;
    switch (question.type) {
        case "multiple_choice": return Number.isSafeInteger(value.choiceIndex) && (value.choiceIndex as number) >= 0 && (value.choiceIndex as number) < question.options.length;
        case "true_false": return typeof value.value === "boolean";
        case "short_answer": return typeof value.text === "string" && value.text.length <= 2000;
    }
}

/** Reject the entire checkpoint rather than quietly losing or changing any saved answer. */
export function sanitizeProgress(raw: unknown, questions: readonly Question[]): ActivityProgress | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const quiz = value.quiz as Record<string, unknown> | undefined;
    if (!quiz || quiz.version !== 1 || !Array.isArray(quiz.answers) || quiz.answers.length > questions.length) return null;
    const seen = new Set<number>();
    const answers: QuizProgress["answers"] = [];
    for (const entry of quiz.answers) {
        if (!entry || typeof entry !== "object") return null;
        const { questionIndex, answer } = entry as Record<string, unknown>;
        if (!Number.isSafeInteger(questionIndex) || (questionIndex as number) < 0 || !questions[questionIndex as number] || seen.has(questionIndex as number) ||
            !isAnswerForQuestion(answer, questions[questionIndex as number])) return null;
        seen.add(questionIndex as number);
        answers.push({ questionIndex: questionIndex as number, answer: { ...answer } });
    }
    if (value.misses !== undefined && (!Number.isSafeInteger(value.misses) || (value.misses as number) < 0)) return null;
    return { quiz: { version: 1, answers }, ...(value.misses !== undefined ? { misses: value.misses as number } : {}) };
}
