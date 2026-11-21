"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/provider";
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
    const { t } = useI18n();
    return (
        <Modal
            open={attempt !== null}
            title={attempt ? t("{value0} · {value1}", { value0: attempt.studentName, value1: attempt.quizName }) : ""}
            onClose={onClose}
            size="lg"
        >
            {attempt && (
                <div>
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                        <ScorePill score={attempt.score} />
                        <span>
                            {attempt.correct}/{attempt.total}{" "}{t("correct")}</span>
                        <span className="text-slate-500">·</span>
                        <span>{formatDateTime(attempt.completedAt)}</span>
                        <span className="text-slate-500">·</span>
                        <span>⏱ {formatDuration(attempt.startedAt, attempt.completedAt)}</span>
                    </div>

                    {attempt.activityId === "catching_bugs" && (
                        <p className="mb-4 rounded-lg border border-amber-700/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                            {attempt.mode === "practice" ? t("Practice") : t("Assessment")}{" "}{t("· Miss:")}{" "}{attempt.misses ?? attempt.total - attempt.correct}
                            {attempt.mode === "practice" && t(" · Scores use each question’s final answer; misses count every wrong attempt.")}
                        </p>
                    )}

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
                                        {record.correct ? t("✔ Correct") : t("✘ Incorrect")}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-100">{record.question.text}</p>
                                {record.question.image && <Image src={record.question.image.src} alt={record.question.image.alt}
                                    width={record.question.image.width} height={record.question.image.height} unoptimized className="mt-2 max-h-32 w-auto max-w-full rounded bg-white object-contain" />}
                                <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                                    <span className="text-slate-400">{t("Answer:")}{" "}
                                        <strong className={record.correct ? "text-emerald-200" : "text-rose-200"}>
                                            {record.question.type === "true_false" ? t(describeAnswer(record.question, record.answer)) : describeAnswer(record.question, record.answer)}
                                        </strong>
                                    </span>
                                    {!record.correct && (
                                        <span className="text-slate-400">{t("Expected:")}{" "}
                                            <strong className="text-emerald-200">
                                                {record.question.type === "true_false" ? t(describeCorrectAnswer(record.question)) : describeCorrectAnswer(record.question)}
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
