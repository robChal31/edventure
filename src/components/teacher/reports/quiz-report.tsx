"use client";

import Link from "next/link";
import { useMemo } from "react";
import { describeCorrectAnswer } from "@/quiz/grading";
import { useAttempts, useHydrated, useQuizzes, useStudents } from "@/lms/hooks";
import { attemptsToCsv, downloadCsv } from "@/lms/services/csv";
import {
    attemptStats,
    completionForQuiz,
    formatRelative,
    questionBreakdown,
    sortByNewest,
    studentRowsForQuiz,
} from "@/lms/services/reports";
import { QuestionTypeBadge, ScorePill, StatusPill } from "@/components/ui/badges";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/panels";
import PixelButton, { pixelButtonClass } from "@/components/ui/pixel-button";
import AttemptsTable from "./attempts-table";

export default function QuizReport({ quizId }: { quizId: string }) {
    const hydrated = useHydrated();
    const quizzes = useQuizzes();
    const students = useStudents();
    const allAttempts = useAttempts();

    const quiz = quizzes.find((q) => q.id === quizId);
    const attempts = useMemo(
        () => sortByNewest(allAttempts.filter((a) => a.quizId === quizId)),
        [allAttempts, quizId]
    );
    const breakdown = useMemo(() => questionBreakdown(attempts), [attempts]);

    if (!hydrated) return <Skeleton rows={4} />;

    // Reports survive deleted quizzes: fall back to the attempts' snapshot.
    const title = quiz?.name ?? attempts[0]?.quizName;
    if (!title) {
        return (
            <EmptyState
                icon="🔍"
                title="QUIZ NOT FOUND"
                action={
                    <Link href="/teacher/reports" className={pixelButtonClass("sky")}>
                        ← All reports
                    </Link>
                }
            />
        );
    }

    const stats = attemptStats(attempts);
    const completion = quiz ? completionForQuiz(quiz, students, attempts) : null;
    const rows = quiz ? studentRowsForQuiz(quiz, students, attempts) : [];

    return (
        <>
            <Link href="/teacher/reports" className="mb-3 inline-block text-xs font-semibold text-sky-300 hover:underline">
                ← All reports
            </Link>
            <PageHeader
                title={title}
                description={quiz ? <StatusPill published={quiz.published} /> : "This quiz was deleted — showing saved results."}
                actions={
                    <>
                        {quiz && (
                            <Link href={`/teacher/preview/${quiz.id}`} className={pixelButtonClass("violet", "md")}>
                                ▶ Preview
                            </Link>
                        )}
                        <PixelButton
                            tone="emerald"
                            disabled={attempts.length === 0}
                            onClick={() => downloadCsv(`${title.replace(/[^\w-]+/g, "_")}-results.csv`, attemptsToCsv(attempts))}
                        >
                            ⬇ CSV
                        </PixelButton>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon="🎯" label="Average" value={stats.averageScore === null ? "—" : `${stats.averageScore}%`} tone="violet" />
                <StatCard icon="🏆" label="Best" value={stats.bestScore === null ? "—" : `${stats.bestScore}%`} tone="amber" />
                <StatCard
                    icon="✅"
                    label="Completed"
                    value={completion ? `${completion.completed}/${completion.assigned}` : "—"}
                    hint="assigned students"
                    tone="emerald"
                />
                <StatCard icon="🔁" label="Attempts" value={stats.count} hint={`last ${formatRelative(stats.lastCompletedAt)}`} tone="sky" />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <section>
                    <h2 className="mb-1 font-pixel text-xs text-sky-300">QUESTIONS — HARDEST FIRST</h2>
                    <p className="mb-3 text-xs text-slate-500">The most common wrong answer often reveals a misconception.</p>
                    {breakdown.length === 0 ? (
                        <p className="rounded-lg border-2 border-dashed border-slate-800 p-4 text-sm text-slate-500">No answers yet.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {breakdown.map((row) => (
                                <li key={row.questionId} className="pixel-panel rounded-xl bg-slate-900 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <QuestionTypeBadge type={row.question.type} compact />
                                            <p className="mt-1.5 text-sm font-semibold text-slate-100">{row.question.text}</p>
                                        </div>
                                        <ScorePill score={row.correctRate} />
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className={`h-full rounded-full ${row.correctRate >= 80 ? "bg-emerald-500" : row.correctRate >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                                            style={{ width: `${row.correctRate}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                        <span>
                                            {row.correct}/{row.answered} correct
                                        </span>
                                        <span>
                                            Answer: <span className="text-emerald-300">{describeCorrectAnswer(row.question)}</span>
                                        </span>
                                        {row.commonWrongAnswer && (
                                            <span>
                                                Common mistake: <span className="text-rose-300">&ldquo;{row.commonWrongAnswer.label}&rdquo;</span> ×
                                                {row.commonWrongAnswer.count}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <h2 className="mb-3 font-pixel text-xs text-sky-300">STUDENTS</h2>
                    {rows.length === 0 ? (
                        <p className="rounded-lg border-2 border-dashed border-slate-800 p-4 text-sm text-slate-500">No students assigned.</p>
                    ) : (
                        <div className="pixel-panel divide-y divide-slate-800 rounded-xl bg-slate-900">
                            {rows.map((row) => (
                                <div key={row.student.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                    <Link href={`/teacher/students/${row.student.id}`} className="flex min-w-0 items-center gap-2 font-semibold text-slate-100 hover:text-amber-300">
                                        <span aria-hidden>{row.student.avatar}</span>
                                        <span className="truncate">{row.student.name}</span>
                                        {row.student.className && <span className="text-xs font-normal text-slate-500">{row.student.className}</span>}
                                    </Link>
                                    <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
                                        {row.attempts === 0 ? (
                                            <span className="rounded-md bg-slate-800 px-2 py-0.5">Not started</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {row.attempts}× · {formatRelative(row.latest?.completedAt ?? null)}
                                                </span>
                                                <ScorePill score={row.bestScore} label="best" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="mt-8">
                <h2 className="mb-3 font-pixel text-xs text-sky-300">ATTEMPTS</h2>
                <AttemptsTable attempts={attempts} students={students} showQuiz={false} />
            </section>
        </>
    );
}
