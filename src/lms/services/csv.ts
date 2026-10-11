import { describeAnswer, describeCorrectAnswer } from "@/quiz/grading";
import { QUESTION_TYPES } from "@/quiz/question-types";
import type { QuizAttempt } from "../types";

function cell(value: string | number): string {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(values: Array<string | number>): string {
    return values.map(cell).join(",");
}

/** One line per answered question — easy to pivot in a spreadsheet. */
export function attemptsToCsv(attempts: readonly QuizAttempt[]): string {
    const lines = [
        row([
            "Completed at",
            "Student",
            "Quiz",
            "Attempt score (%)",
            "Question #",
            "Question type",
            "Question",
            "Student answer",
            "Correct answer",
            "Correct?",
        ]),
    ];

    attempts.forEach((attempt) => {
        attempt.records.forEach((record, index) => {
            lines.push(
                row([
                    attempt.completedAt,
                    attempt.studentName,
                    attempt.quizName,
                    attempt.score,
                    index + 1,
                    QUESTION_TYPES[record.question.type].label,
                    record.question.text,
                    describeAnswer(record.question, record.answer),
                    describeCorrectAnswer(record.question),
                    record.correct ? "yes" : "no",
                ])
            );
        });
    });

    return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
    // BOM so Excel opens UTF-8 (emoji, accents) correctly.
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
