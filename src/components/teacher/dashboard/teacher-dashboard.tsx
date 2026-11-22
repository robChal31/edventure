"use client";

import { useI18n } from "@/i18n/provider";
import { systemQuestText } from "@/i18n/system-quests";
import Link from "next/link";
import { useAttempts, useHydrated, useQuestions, useQuizzes, useStudents } from "@/lms/hooks";
import { attemptStats, completionForQuiz, sortByNewest } from "@/lms/services/reports";
import { resolveQuizQuestions } from "@/lms/services/playable-quiz";
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from "@/quiz/question-types";
import { ScorePill, StatusPill } from "@/components/ui/badges";
import { PageHeader, Skeleton, StatCard } from "@/components/ui/panels";
import { pixelButtonClass } from "@/components/ui/pixel-button";
import AttemptsTable from "../reports/attempts-table";

export default function TeacherDashboard() {
    const { t } = useI18n();
    const hydrated = useHydrated();
    const students = useStudents();
    const questions = useQuestions();
    const quizzes = useQuizzes();
    const attempts = useAttempts();

    if (!hydrated) {
        return (
            <>
                <PageHeader title={t("Dashboard")} />
                <Skeleton rows={4} />
            </>
        );
    }

    const stats = attemptStats(attempts);
    const published = quizzes.filter((quiz) => quiz.published).length;
    const classes = new Set(students.map((s) => s.className).filter(Boolean)).size;
    const typeCounts = QUESTION_TYPE_ORDER.map(
        (type) => `${QUESTION_TYPES[type].icon} ${questions.filter((q) => q.type === type).length}`
    ).join("  ");

    return (
        <>
            <PageHeader
                title={t("Dashboard")}
                description={t("Your class at a glance.")}
                actions={
                    <>
                        <Link href="/teacher/questions" className={pixelButtonClass("sky", "sm")}>{t("+ Question")}</Link>
                        <Link href="/teacher/quizzes" className={pixelButtonClass("amber", "sm")}>{t("+ Quiz")}</Link>
                        <Link href="/teacher/students" className={pixelButtonClass("emerald", "sm")}>{t("+ Student")}</Link>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    icon="🧒"
                    label={t("Students")}
                    value={students.length}
                    hint={classes ? t("{value0} class{value1}", { value0: classes, value1: classes === 1 ? "" : "es" }) : t("No classes yet")}
                    tone="emerald"
                />
                <StatCard icon="❓" label={t("Questions")} value={questions.length} hint={typeCounts} tone="sky" />
                <StatCard
                    icon="📜"
                    label={t("Quizzes")}
                    value={quizzes.length}
                    hint={t("{value0} published · {value1} draft", { value0: published, value1: quizzes.length - published })}
                    tone="amber"
                />
                <StatCard
                    icon="🎯"
                    label={t("Average score")}
                    value={stats.averageScore === null ? "—" : `${stats.averageScore}%`}
                    hint={t("{value0} attempt{value1}", { value0: stats.count, value1: stats.count === 1 ? "" : "s" })}
                    tone="violet"
                />
            </div>

            <section className="mt-8">
                <h2 className="mb-3 font-pixel text-xs text-sky-300">{t("QUIZ PROGRESS")}</h2>
                {quizzes.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("No quizzes yet.")}</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {quizzes.map((quiz) => {
                            const completion = completionForQuiz(quiz, students, attempts);
                            const quizStats = attemptStats(attempts.filter((a) => a.quizId === quiz.id));
                            const pct = completion.assigned
                                ? Math.round((completion.completed / completion.assigned) * 100)
                                : 0;

                            return (
                                <Link
                                    key={quiz.id}
                                    href={`/teacher/reports/${quiz.id}`}
                                    className="pixel-panel block rounded-xl bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:bg-slate-800/80"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-slate-100">{systemQuestText(quiz.id, "name", quiz.name, t)}</div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                <StatusPill published={quiz.published} />
                                                <span>{resolveQuizQuestions(quiz, questions).length}{" "}{t("questions")}</span>
                                            </div>
                                        </div>
                                        <ScorePill score={quizStats.averageScore} label={t("avg")} />
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{t("Completed")}</span>
                                            <span>
                                                {completion.completed}/{completion.assigned}{" "}{t("students")}</span>
                                        </div>
                                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-800">
                                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-pixel text-xs text-sky-300">{t("RECENT ATTEMPTS")}</h2>
                    <Link href="/teacher/reports" className="text-xs font-semibold text-sky-300 hover:underline">{t("All reports →")}</Link>
                </div>
                <AttemptsTable
                    attempts={sortByNewest(attempts).slice(0, 8)}
                    students={students}
                    emptyText={t("No one has played yet. Share the student codes from the Students page — results appear here live.")}
                />
            </section>
        </>
    );
}
