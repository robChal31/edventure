import type { AnswerValue, Question } from "./types";

/**
 * Answer grading + display helpers for every question type.
 * Pure functions — shared by the quiz session, the student UI and the
 * teacher reports so they can never disagree about what is "correct".
 */

const EDGE_PUNCTUATION = /^[\s.,!?;:'"`´‘’“”()[\]{}-]+|[\s.,!?;:'"`´‘’“”()[\]{}-]+$/g;
const PLAIN_NUMBER = /^[-+]?\d+(\.\d+)?$/;

/**
 * Normalises a short answer for comparison:
 * - trims and collapses whitespace
 * - drops punctuation around the answer ("Mars!" → "Mars")
 * - unless strict (case sensitive): lowercases and removes accents
 */
export function normalizeShortAnswer(
    text: string,
    caseSensitive = false
): string {
    let value = text.normalize("NFKC").replace(/\s+/g, " ");
    value = value.replace(EDGE_PUNCTUATION, "").trim();

    if (!caseSensitive) {
        value = value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    return value;
}

function sameNumber(a: string, b: string): boolean {
    if (!PLAIN_NUMBER.test(a) || !PLAIN_NUMBER.test(b)) {
        return false;
    }
    return Number(a) === Number(b);
}

export function isShortAnswerCorrect(
    text: string,
    acceptedAnswers: readonly string[],
    caseSensitive = false
): boolean {
    const given = normalizeShortAnswer(text, caseSensitive);
    if (!given) {
        return false;
    }

    return acceptedAnswers.some((accepted) => {
        const expected = normalizeShortAnswer(accepted, caseSensitive);
        return (
            expected.length > 0 &&
            (given === expected || sameNumber(given, expected))
        );
    });
}

/** True when the answer is correct for the question. */
export function gradeAnswer(question: Question, answer: AnswerValue): boolean {
    switch (question.type) {
        case "multiple_choice":
            return (
                answer.type === "multiple_choice" &&
                answer.choiceIndex === question.correctIndex
            );

        case "true_false":
            return (
                answer.type === "true_false" &&
                answer.value === question.correctAnswer
            );

        case "short_answer":
            return (
                answer.type === "short_answer" &&
                isShortAnswerCorrect(
                    answer.text,
                    question.acceptedAnswers,
                    question.caseSensitive
                )
            );
    }
}

export function booleanLabel(value: boolean): string {
    return value ? "True" : "False";
}

/** Human-readable version of what the student answered. */
export function describeAnswer(question: Question, answer: AnswerValue): string {
    switch (answer.type) {
        case "multiple_choice":
            if (question.type !== "multiple_choice") return "—";
            return question.options[answer.choiceIndex] ?? "—";

        case "true_false":
            return booleanLabel(answer.value);

        case "short_answer":
            return answer.text.trim() || "(no answer)";
    }
}

/** Human-readable correct answer ("Mars", "False", "12 / twelve"). */
export function describeCorrectAnswer(question: Question): string {
    switch (question.type) {
        case "multiple_choice":
            return question.options[question.correctIndex] ?? "—";

        case "true_false":
            return booleanLabel(question.correctAnswer);

        case "short_answer":
            return question.acceptedAnswers
                .map((answer) => answer.trim())
                .filter(Boolean)
                .join(" / ");
    }
}
