"use client";

import { describeAnswer, describeCorrectAnswer } from "@/quiz/grading";
import type { QuizAttempt } from "@/lms/types";
import { formatDateTime, formatDuration } from "@/lms/services/reports";
import { QuestionTypeBadge, ScorePill } from "@/components/ui/badges";
import Modal from "@/components/ui/modal";

/** Every answer of one attempt, question by question. */
export default function AttemptDetail({
    attempt,
    onClose,
}: {
    attempt: QuizAttempt | null;
    onClose: () => void;
}) {
    return (
        <Modal
            open={attempt !== null}
            title={attempt ? `${attempt.studentName} · ${attempt.quizName}` : ""}
            onClose={onClose}
            size="lg"
        >
            {attempt && (
                <div>
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                        <ScorePill score={attempt.score} />
                        <span>
                            {attempt.correct}/{attempt.total} correct
                        </span>
                        <span className="text-slate-500">·</span>
                        <span>{formatDateTime(attempt.completedAt)}</span>
                        <span className="text-slate-500">·</span>
                        <span>⏱ {formatDuration(attempt.startedAt, attempt.completedAt)}</span>
                    </div>

                    <ol className="flex flex-col gap-2">
                        {attempt.records.map((record, index) => (
                            <li
                                key={index}
                                className={`rounded-lg border-2 px-4 py-3 ${
                                    record.correct
                                        ? "border-emerald-700/70 bg-emerald-500/5"
                                        : "border-rose-700/70 bg-rose-500/5"
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-pixel text-[10px] text-slate-500">#{index + 1}</span>
                                    <QuestionTypeBadge type={record.question.type} compact />
                                    <span className={`ml-auto font-bold ${record.correct ? "text-emerald-300" : "text-rose-300"}`}>
                                        {record.correct ? "✔ Correct" : "✘ Incorrect"}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-100">{record.question.text}</p>
                                <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                                    <span className="text-slate-400">
                                        Answer:{" "}
                                        <strong className={record.correct ? "text-emerald-200" : "text-rose-200"}>
                                            {describeAnswer(record.question, record.answer)}
                                        </strong>
                                    </span>
                                    {!record.correct && (
                                        <span className="text-slate-400">
                                            Expected:{" "}
                                            <strong className="text-emerald-200">
                                                {describeCorrectAnswer(record.question)}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </Modal>
    );
}
