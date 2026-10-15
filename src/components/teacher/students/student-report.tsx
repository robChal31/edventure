"use client";

import Link from "next/link";
import { useMemo } from "react";
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from "@/quiz/question-types";
import { useAttempts, useHydrated, useQuestions, useQuizzes, useSignedInStaff, useStudents } from "@/lms/hooks";
import { isQuizAssignedTo, visibleStudents } from "@/lms/access";
import {
    accuracyByType,
    attemptStats,
    formatRelative,
    progressByQuiz,
    sortByNewest,
} from "@/lms/services/reports";
import { questsForStudent } from "@/lms/services/playable-quiz";
import { ScorePill } from "@/components/ui/badges";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/panels";
import { pixelButtonClass } from "@/components/ui/pixel-button";
import AttemptsTable from "../reports/attempts-table";

export default function StudentReport({ studentId }: { studentId: string }) {
    const hydrated = useHydrated();
    const students = useStudents();
    const quizzes = useQuizzes();
    const questions = useQuestions();
    const allAttempts = useAttempts();

    const actor = useSignedInStaff();
    const student = visibleStudents(actor, students).find((s) => s.id === studentId);
    const attempts = useMemo(
        () => sortByNewest(allAttempts.filter((a) => a.studentId === studentId)),
        [allAttempts, studentId]
    );

    if (!hydrated) {
        return <Skeleton rows={4} />;
    }

    if (!student) {
        return (
            <EmptyState
                icon="🔍"
                title="STUDENT NOT FOUND"
                action={
                    <Link href="/teacher/students" className={pixelButtonClass("sky")}>
                        ← All students
                    </Link>
                }
            >
                This student may have been deleted.
            </EmptyState>
        );
    }

    const stats = attemptStats(attempts);
    const accuracy = accuracyByType(attempts);
    const progress = progressByQuiz(attempts);
    const assigned = questsForStudent(student, quizzes, questions);
    const notStarted = assigned.filter((quiz) => !progress.has(quiz.id));

    return (
        <>
            <Link href="/teacher/students" className="mb-3 inline-block text-xs font-semibold text-sky-300 hover:underline">
                ← All students
            </Link>
            <PageHeader
                title={`${student.avatar} ${student.name}`}
                description={
                    <>
                        {student.className ? `Class ${student.className} · ` : ""}Login code{" "}
                        <code className="rounded bg-slate-800 px-1.5 py-0.5 font-pixel text-[10px] text-amber-300">
                            {student.code}
                        </code>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon="🎯" label="Average" value={stats.averageScore === null ? "—" : `${stats.averageScore}%`} tone="violet" />
                <StatCard icon="🏆" label="Best" value={stats.bestScore === null ? "—" : `${stats.bestScore}%`} tone="amber" />
                <StatCard icon="📜" label="Quizzes done" value={`${progress.size}/${assigned.length}`} hint={`${stats.count} attempt${stats.count === 1 ? "" : "s"}`} tone="emerald" />
                <StatCard icon="🕒" label="Last played" value={<span className="text-sm">{formatRelative(stats.lastCompletedAt)}</span>} tone="sky" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <section>
                    <h2 className="mb-3 font-pixel text-xs text-sky-300">ACCURACY BY QUESTION TYPE</h2>
                    <div className="pixel-panel flex flex-col gap-3 rounded-xl bg-slate-900 p-4">
                        {QUESTION_TYPE_ORDER.map((type) => {
                            const bucket = accuracy[type];
                            const pct = bucket.answered ? Math.round((bucket.correct / bucket.answered) * 100) : null;
                            return (
                                <div key={type}>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-200">
                                            {QUESTION_TYPES[type].icon} {QUESTION_TYPES[type].label}
                                        </span>
                                        <span className="tabular-nums text-slate-400">
                                            {bucket.correct}/{bucket.answered} {pct !== null && `· ${pct}%`}
                                        </span>
                                    </div>
                                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className={`h-full rounded-full ${
                                                pct === null ? "" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500"
                                            }`}
                                            style={{ width: `${pct ?? 0}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="mb-3 font-pixel text-xs text-sky-300">QUIZZES</h2>
                    <div className="pixel-panel flex flex-col divide-y divide-slate-800 rounded-xl bg-slate-900">
                        {Array.from(progress.values()).map((item) => (
                            <div key={item.quizId} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-100">{item.quizName}</div>
                                    <div className="text-xs text-slate-400">
                                        {item.count} attempt{item.count === 1 ? "" : "s"} · last {formatRelative(item.latest.completedAt)}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                                    best <ScorePill score={item.best.score} />
                                </div>
                            </div>
                        ))}
                        {notStarted.map((quiz) => (
                            <div key={quiz.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-300">{quiz.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {isQuizAssignedTo(quiz, student) ? "Assigned · not started" : "Not started"}
                                    </div>
                                </div>
                                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">To do</span>
                            </div>
                        ))}
                        {progress.size === 0 && notStarted.length === 0 && (
                            <p className="px-4 py-3 text-sm text-slate-500">No quizzes assigned yet.</p>
                        )}
                    </div>
                </section>
            </div>

            <section className="mt-8">
                <h2 className="mb-3 font-pixel text-xs text-sky-300">ALL ATTEMPTS</h2>
                <AttemptsTable
                    attempts={attempts}
                    students={students}
                    showStudent={false}
                    emptyText={`${student.name} hasn't finished a quiz yet.`}
                />
            </section>
        </>
    );
}
