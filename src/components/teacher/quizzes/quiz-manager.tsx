"use client";

import Link from "next/link";
import { useState } from "react";
import { getActivity } from "@/quiz/activities";
import { QUESTION_TYPES } from "@/quiz/question-types";
import type { Quiz } from "@/lms/types";
import { useAttempts, useHydrated, useQuestions, useQuizzes, useStudents } from "@/lms/hooks";
import {
    deleteQuiz,
    draftFromQuiz,
    duplicateQuiz,
    emptyQuizDraft,
    setQuizPublished,
    type QuizDraft,
} from "@/lms/repositories/quiz-repository";
import { attemptStats, completionForQuiz } from "@/lms/services/reports";
import { resolveQuizQuestions } from "@/lms/services/playable-quiz";
import { ScorePill, StatusPill } from "@/components/ui/badges";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton, { pixelButtonClass } from "@/components/ui/pixel-button";
import QuizEditor from "./quiz-editor";

export default function QuizManager() {
    const hydrated = useHydrated();
    const quizzes = useQuizzes();
    const questions = useQuestions();
    const students = useStudents();
    const attempts = useAttempts();

    const [editing, setEditing] = useState<QuizDraft | null>(null);
    const [deleting, setDeleting] = useState<Quiz | null>(null);

    return (
        <>
            <PageHeader
                title="Quizzes"
                description="A quiz is a set of questions students play as a quest. Assign it to everyone or to chosen students."
                actions={
                    <PixelButton tone="amber" onClick={() => setEditing(emptyQuizDraft())}>
                        + New quiz
                    </PixelButton>
                }
            />

            {!hydrated ? (
                <Skeleton rows={3} />
            ) : quizzes.length === 0 ? (
                <EmptyState
                    icon="📜"
                    title="NO QUIZZES YET"
                    action={
                        <PixelButton tone="amber" onClick={() => setEditing(emptyQuizDraft())}>
                            + Create a quiz
                        </PixelButton>
                    }
                >
                    Bundle questions from your bank into a quest for your students.
                </EmptyState>
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {quizzes.map((quiz) => {
                        const resolved = resolveQuizQuestions(quiz, questions);
                        const types = Array.from(new Set(resolved.map((q) => q.type)));
                        const stats = attemptStats(attempts.filter((a) => a.quizId === quiz.id));
                        const completion = completionForQuiz(quiz, students, attempts);
                        const activity = getActivity(quiz.activityId);

                        return (
                            <article key={quiz.id} className="pixel-panel flex flex-col rounded-xl bg-slate-900 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-bold text-slate-100">{quiz.name}</h2>
                                        {quiz.description && (
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{quiz.description}</p>
                                        )}
                                    </div>
                                    <StatusPill published={quiz.published} />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                    <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sky-300 ring-1 ring-sky-500/40">
                                        {activity.icon} {activity.label} · {activity.location}
                                    </span>
                                    <span className="rounded-md bg-slate-800 px-2 py-0.5">
                                        {resolved.length} question{resolved.length === 1 ? "" : "s"}{" "}
                                        {types.map((t) => QUESTION_TYPES[t].icon).join(" ")}
                                    </span>
                                    <span className="rounded-md bg-slate-800 px-2 py-0.5">
                                        {quiz.assignment.mode === "everyone"
                                            ? "🌍 Everyone"
                                            : `🎯 ${quiz.assignment.studentIds.length} student${quiz.assignment.studentIds.length === 1 ? "" : "s"}`}
                                    </span>
                                    {quiz.shuffleQuestions && <span className="rounded-md bg-slate-800 px-2 py-0.5">🔀 Shuffled</span>}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                    <span>
                                        Completed by{" "}
                                        <strong className="text-slate-200">
                                            {completion.completed}/{completion.assigned}
                                        </strong>
                                    </span>
                                    <span>
                                        {stats.count} attempt{stats.count === 1 ? "" : "s"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        Avg <ScorePill score={stats.averageScore} />
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    <PixelButton tone="sky" size="sm" onClick={() => setEditing(draftFromQuiz(quiz))}>
                                        ✎ Edit
                                    </PixelButton>
                                    {resolved.length > 0 && (
                                        <Link href={`/teacher/preview/${quiz.id}`} className={pixelButtonClass("violet", "sm")}>
                                            ▶ Preview
                                        </Link>
                                    )}
                                    <Link href={`/teacher/reports/${quiz.id}`} className={pixelButtonClass("emerald", "sm")}>
                                        📊 Report
                                    </Link>
                                    <PixelButton tone="slate" size="sm" onClick={() => setQuizPublished(quiz.id, !quiz.published)}>
                                        {quiz.published ? "Unpublish" : "Publish"}
                                    </PixelButton>
                                    <PixelButton tone="slate" size="sm" onClick={() => duplicateQuiz(quiz.id)} title="Duplicate">
                                        ⧉
                                    </PixelButton>
                                    <PixelButton tone="rose" size="sm" onClick={() => setDeleting(quiz)} title="Delete">
                                        🗑
                                    </PixelButton>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <QuizEditor draft={editing} onClose={() => setEditing(null)} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete quiz?"
                danger
                confirmLabel="Delete"
                message={
                    <p>
                        &ldquo;{deleting?.name}&rdquo; disappears from every quest board. Questions stay in the bank and
                        past results stay in the reports.
                    </p>
                }
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteQuiz(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}
