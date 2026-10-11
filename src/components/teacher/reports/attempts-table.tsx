"use client";

import Link from "next/link";
import { useState } from "react";
import type { QuizAttempt, Student } from "@/lms/types";
import { formatDateTime, formatDuration, formatRelative } from "@/lms/services/reports";
import { ScorePill } from "@/components/ui/badges";
import AttemptDetail from "./attempt-detail";

type AttemptsTableProps = {
    attempts: readonly QuizAttempt[];
    students?: readonly Student[];
    showStudent?: boolean;
    showQuiz?: boolean;
    emptyText?: string;
};

/** Attempts list with a click-through to every answer. */
export default function AttemptsTable({
    attempts,
    students = [],
    showStudent = true,
    showQuiz = true,
    emptyText = "No attempts yet.",
}: AttemptsTableProps) {
    const [open, setOpen] = useState<QuizAttempt | null>(null);
    const byId = new Map(students.map((student) => [student.id, student]));

    if (attempts.length === 0) {
        return <p className="rounded-lg border-2 border-dashed border-slate-800 p-4 text-sm text-slate-500">{emptyText}</p>;
    }

    return (
        <>
            <div className="overflow-x-auto rounded-xl border-2 border-slate-800">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                        <tr>
                            {showStudent && <th className="px-4 py-2.5">Student</th>}
                            {showQuiz && <th className="px-4 py-2.5">Quiz</th>}
                            <th className="px-4 py-2.5">Score</th>
                            <th className="px-4 py-2.5">Correct</th>
                            <th className="px-4 py-2.5">Time</th>
                            <th className="px-4 py-2.5">Finished</th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {attempts.map((attempt) => {
                            const student = byId.get(attempt.studentId);
                            return (
                                <tr key={attempt.id} className="hover:bg-slate-900/60">
                                    {showStudent && (
                                        <td className="px-4 py-2.5">
                                            {student ? (
                                                <Link href={`/teacher/students/${student.id}`} className="font-semibold text-slate-100 hover:text-amber-300">
                                                    {student.avatar} {student.name}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400">{attempt.studentName} (removed)</span>
                                            )}
                                        </td>
                                    )}
                                    {showQuiz && (
                                        <td className="px-4 py-2.5">
                                            <Link href={`/teacher/reports/${attempt.quizId}`} className="text-slate-200 hover:text-amber-300">
                                                {attempt.quizName}
                                            </Link>
                                        </td>
                                    )}
                                    <td className="px-4 py-2.5">
                                        <ScorePill score={attempt.score} />
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                                        {attempt.correct}/{attempt.total}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400">
                                        {formatDuration(attempt.startedAt, attempt.completedAt)}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400" title={formatDateTime(attempt.completedAt)}>
                                        {formatRelative(attempt.completedAt)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(attempt)}
                                            className="rounded-md px-2 py-1 text-xs font-semibold text-sky-300 hover:bg-slate-800"
                                        >
                                            Answers →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <AttemptDetail attempt={open} onClose={() => setOpen(null)} />
        </>
    );
}
