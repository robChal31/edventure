"use client";

import FormSelect from "@/components/ui/form-select";

import { useI18n } from "@/i18n/provider";
import { systemQuestText } from "@/i18n/system-quests";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getActivity } from "@/quiz/activities";
import { QUESTION_TYPES } from "@/quiz/question-types";
import { CURRICULA, DIFFICULTIES, GRADES } from "@/quiz/taxonomy";
import type { Quiz } from "@/lms/types";
import {
    assignmentLabel,
    authoringSchoolId,
    canAuthorContent,
    canEditOwned,
    visibleClasses,
    visibleQuizzes,
    visibleStudents,
} from "@/lms/access";
import { useAttempts, useClasses, useHydrated, useQuestions, useQuizzes, useSignedInStaff, useStudents } from "@/lms/hooks";
import { copyQuestionTo, isUnlabelled } from "@/lms/repositories/question-repository";
import { schoolName } from "@/lms/repositories/organisation-repository";
import {
    copyQuizToSchool,
    deleteQuiz,
    draftFromQuiz,
    duplicateQuiz,
    emptyQuizDraft,
    setQuizPublished,
    type QuizDraft,
} from "@/lms/repositories/quiz-repository";
import { attemptStats, completionForQuiz } from "@/lms/services/reports";
import { resolveQuizQuestions } from "@/lms/services/playable-quiz";
import { ChipTag, ScorePill, StatusPill } from "@/components/ui/badges";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton, { pixelButtonClass } from "@/components/ui/pixel-button";
import QuizEditor from "./quiz-editor";

export default function QuizManager() {
    const { t } = useI18n();
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const allQuizzes = useQuizzes();
    const allQuestions = useQuestions();
    const allStudents = useStudents();
    const allClasses = useClasses();
    const attempts = useAttempts();

    const quizzes = useMemo(() => visibleQuizzes(actor, allQuizzes), [actor, allQuizzes]);
    const students = useMemo(() => visibleStudents(actor, allStudents), [actor, allStudents]);
    const classes = useMemo(() => visibleClasses(actor, allClasses), [actor, allClasses]);

    const [source, setSource] = useState<"all" | "global" | "school">("all");
    const [grade, setGrade] = useState("");
    const [editing, setEditing] = useState<QuizDraft | null>(null);
    const [deleting, setDeleting] = useState<Quiz | null>(null);

    const shown = quizzes.filter(
        (quiz) =>
            (source === "all" || (source === "global" ? quiz.schoolId === null : quiz.schoolId !== null)) &&
            (!grade || quiz.grade === Number(grade))
    );

    const canAuthor = canAuthorContent(actor);
    const authorSchool = authoringSchoolId(actor);
    const newQuiz = () => setEditing(emptyQuizDraft(authorSchool));

    /** Adopt a global quiz: copy it and any global questions it uses into this school. */
    const adoptQuiz = (quiz: Quiz) => {
        if (!authorSchool) return;
        const questionIds = quiz.questionIds.map((qid) => {
            const question = allQuestions.find((q) => q.id === qid);
            if (!question || question.schoolId !== null) return qid;
            return copyQuestionTo(qid, authorSchool)?.id ?? qid;
        });
        copyQuizToSchool(quiz.id, authorSchool, questionIds);
    };

    return (
        <>
            <PageHeader
                title={t("Quizzes")}
                description={t("A quiz is a set of questions played on a map (activity) you choose. Assign it to everyone, to whole classes, or to chosen students.")}
                actions={
                    canAuthor ? (
                        <PixelButton tone="amber" onClick={newQuiz}>{t("+ New quiz")}</PixelButton>
                    ) : null
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                    [
                        ["all", "All"],
                        ["global", "🌍 Global bank"],
                        ["school", actor?.role === "super_admin" ? "🏫 Schools" : "🏫 My school"],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={source === value}
                        onClick={() => setSource(value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            source === value ? "bg-amber-400 text-amber-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        {t(label)}
                    </button>
                ))}
                <FormSelect value={grade} onValueChange={(e) => setGrade(e)} className={`w-full w-auto`} aria-label={t("Filter by grade")}>
                    <option value="">{t("Any grade")}</option>
                    {GRADES.map((g) => (
                        <option key={g} value={g}>{t("Grade")}{" "}{g}</option>
                    ))}
                </FormSelect>
            </div>

            {!hydrated ? (
                <Skeleton rows={3} />
            ) : quizzes.length === 0 ? (
                <EmptyState
                    icon="📜"
                    title={t("NO QUIZZES YET")}
                    action={
                        canAuthor ? (
                            <PixelButton tone="amber" onClick={newQuiz}>{t("+ Create a quiz")}</PixelButton>
                        ) : undefined
                    }
                >{t("Bundle questions from the bank into a quest for your students.")}</EmptyState>
            ) : shown.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">{t("No quizzes match these filters.")}</p>
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {shown.map((quiz) => {
                        const resolved = resolveQuizQuestions(quiz, allQuestions);
                        const types = Array.from(new Set(resolved.map((q) => q.type)));
                        const stats = attemptStats(attempts.filter((a) => a.quizId === quiz.id));
                        const completion = completionForQuiz(quiz, allStudents, attempts);
                        const activity = getActivity(quiz.activityId);
                        const isGlobal = quiz.schoolId === null || quiz.schoolId === undefined;
                        const editable = canEditOwned(actor, quiz.schoolId ?? null);
                        const unlabelled = resolved.filter(isUnlabelled).length;

                        return (
                            <article key={quiz.id} className="pixel-panel flex flex-col rounded-xl bg-slate-900 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-bold text-slate-100">{systemQuestText(quiz.id, "name", quiz.name, t)}</h2>
                                        {quiz.description && (
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{systemQuestText(quiz.id, "description", quiz.description, t)}</p>
                                        )}
                                    </div>
                                    <StatusPill published={quiz.published} />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                                    <ChipTag tone={isGlobal ? "emerald" : "slate"}>
                                        {isGlobal ? t("🌍 Global") : t("🏫 {value0}", { value0: schoolName(quiz.schoolId) })}
                                    </ChipTag>
                                    {quiz.grade !== undefined && <ChipTag tone="amber">{t("Grade")}{" "}{quiz.grade}</ChipTag>}
                                    {quiz.subject && <ChipTag tone="sky">{quiz.subject}</ChipTag>}
                                    {quiz.topic && <ChipTag>{quiz.topic}</ChipTag>}
                                    {quiz.curriculum && <ChipTag tone="violet">{t(CURRICULA[quiz.curriculum].label)}</ChipTag>}
                                    {quiz.difficulty && <ChipTag>{DIFFICULTIES[quiz.difficulty].icon} {t(DIFFICULTIES[quiz.difficulty].label)}</ChipTag>}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                    <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sky-300 ring-1 ring-sky-500/40">
                                        {activity.icon} {t(activity.label)} · {t(activity.location)}
                                    </span>
                                    <span className="rounded-md bg-slate-800 px-2 py-0.5">
                                        {t("{count} question{suffix}", { count: resolved.length, suffix: resolved.length === 1 ? "" : "s" })}{" "}
                                        {types.map((t) => QUESTION_TYPES[t].icon).join(" ")}
                                    </span>
                                    <span className="rounded-md bg-slate-800 px-2 py-0.5">
                                        🎯 {assignmentLabel(quiz.assignment, classes, students)}
                                    </span>
                                    {quiz.shuffleQuestions && <span className="rounded-md bg-slate-800 px-2 py-0.5">{t("🔀 Shuffled")}</span>}
                                    {unlabelled > 0 && (
                                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">
                                            ⚠ {unlabelled}{" "}{t("unlabelled question")}{unlabelled === 1 ? "" : "s"}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                    <span>{t("Completed by")}{" "}
                                        <strong className="text-slate-200">
                                            {completion.completed}/{completion.assigned}
                                        </strong>
                                    </span>
                                    <span>
                                        {stats.count}{" "}{t("attempt")}{stats.count === 1 ? "" : "s"}
                                    </span>
                                    <span className="flex items-center gap-1">{t("Avg")}{" "}<ScorePill score={stats.averageScore} />
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {editable ? (
                                        <>
                                            <PixelButton tone="sky" size="sm" onClick={() => setEditing(draftFromQuiz(quiz))}>{t("✎ Edit")}</PixelButton>
                                            <PixelButton tone="slate" size="sm" onClick={() => setQuizPublished(quiz.id, !quiz.published)}>
                                                {quiz.published ? t("Unpublish") : t("Publish")}
                                            </PixelButton>
                                            <PixelButton tone="slate" size="sm" onClick={() => duplicateQuiz(quiz.id)} title={t("Duplicate")}>
                                                ⧉
                                            </PixelButton>
                                            <PixelButton tone="rose" size="sm" onClick={() => setDeleting(quiz)} title={t("Delete")}>
                                                🗑
                                            </PixelButton>
                                        </>
                                    ) : (
                                        canAuthor &&
                                        authorSchool && (
                                            <PixelButton tone="emerald" size="sm" onClick={() => adoptQuiz(quiz)} title={t("Copy this quiz and its global questions to your school")}>{t("⧉ Copy to my school")}</PixelButton>
                                        )
                                    )}
                                    {resolved.length > 0 && (
                                        <Link href={`/teacher/preview/${quiz.id}`} className={pixelButtonClass("violet", "sm")}>{t("▶ Preview")}</Link>
                                    )}
                                    <Link href={`/teacher/reports/${quiz.id}`} className={pixelButtonClass("emerald", "sm")}>{t("📊 Report")}</Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <QuizEditor draft={editing} onClose={() => setEditing(null)} />

            <ConfirmDialog
                open={deleting !== null}
                title={t("Delete quiz?")}
                danger
                confirmLabel={t("Delete")}
                message={
                    <p>{"“"}{deleting ? systemQuestText(deleting.id, "name", deleting.name, t) : ""}{t("” disappears from every quest board. Questions stay in the bank and past results stay in the reports.")}</p>
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
