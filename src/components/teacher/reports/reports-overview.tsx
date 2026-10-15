"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAttempts, useHydrated, useQuizzes, useStudents } from "@/lms/hooks";
import { attemptsToCsv, downloadCsv } from "@/lms/services/csv";
import { attemptStats, completionForQuiz, sortByNewest } from "@/lms/services/reports";
import { ScorePill } from "@/components/ui/badges";
import { inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import AttemptsTable from "./attempts-table";

export default function ReportsOverview() {
    const hydrated = useHydrated();
    const attempts = useAttempts();
    const quizzes = useQuizzes();
    const students = useStudents();

    const [quizId, setQuizId] = useState("");
    const [className, setClassName] = useState("");

    const classNames = useMemo(
        () => Array.from(new Set(students.map((s) => s.className).filter(Boolean))).sort(),
        [students]
    );

    const filtered = useMemo(() => {
        const classIds = className
            ? new Set(students.filter((s) => s.className === className).map((s) => s.id))
            : null;
        return sortByNewest(
            attempts.filter(
                (a) => (!quizId || a.quizId === quizId) && (!classIds || classIds.has(a.studentId))
            )
        );
    }, [attempts, students, quizId, className]);

    const exportCsv = () => {
        const date = new Date().toISOString().slice(0, 10);
        downloadCsv(`learning-world-results-${date}.csv`, attemptsToCsv(filtered));
    };

    if (!hydrated) {
        return (
            <>
                <PageHeader title="Reports" />
                <Skeleton rows={4} />
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Reports"
                description="Every finished quiz is saved with each answer. Open a quiz for question-by-question insight."
                actions={
                    <PixelButton tone="emerald" onClick={exportCsv} disabled={filtered.length === 0}>
                        ⬇ Export CSV
                    </PixelButton>
                }
            />

            <section>
                <h2 className="mb-3 font-pixel text-xs text-sky-300">BY QUIZ</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {quizzes.map((quiz) => {
                        const stats = attemptStats(attempts.filter((a) => a.quizId === quiz.id));
                        const completion = completionForQuiz(quiz, students, attempts);
                        return (
                            <Link
                                key={quiz.id}
                                href={`/teacher/reports/${quiz.id}`}
                                className="pixel-panel rounded-xl bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:bg-slate-800/80"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-slate-100">{quiz.name}</span>
                                    <ScorePill score={stats.averageScore} label="avg" />
                                </div>
                                <div className="mt-2 text-xs text-slate-400">
                                    {completion.completed}/{completion.assigned} students done · {stats.count} attempt
                                    {stats.count === 1 ? "" : "s"}
                                </div>
                                <div className="mt-2 text-xs font-semibold text-sky-300">Open report →</div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section className="mt-8">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-pixel text-xs text-sky-300">ALL ATTEMPTS ({filtered.length})</h2>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <select value={quizId} onChange={(e) => setQuizId(e.target.value)} className={`${inputClass} sm:w-52`} aria-label="Filter by quiz">
                            <option value="">All quizzes</option>
                            {quizzes.map((quiz) => (
                                <option key={quiz.id} value={quiz.id}>
                                    {quiz.name}
                                </option>
                            ))}
                        </select>
                        <select value={className} onChange={(e) => setClassName(e.target.value)} className={`${inputClass} sm:w-40`} aria-label="Filter by class">
                            <option value="">All classes</option>
                            {classNames.map((name) => (
                                <option key={name} value={name}>
                                    Class {name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <AttemptsTable
                    attempts={filtered}
                    students={students}
                    emptyText="No attempts match. Results appear here as soon as a student finishes a quiz."
                />
            </section>
        </>
    );
}
