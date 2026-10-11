"use client";

import { useMemo, useState } from "react";
import { describeCorrectAnswer } from "@/quiz/grading";
import {
    draftFromQuestion,
    emptyDraft,
    QUESTION_TYPE_ORDER,
    QUESTION_TYPES,
    type QuestionDraft,
} from "@/quiz/question-types";
import type { Question, QuestionType } from "@/quiz/types";
import { useHydrated, useQuestions, useQuizzes } from "@/lms/hooks";
import {
    deleteQuestion,
    duplicateQuestion,
    listSubjects,
} from "@/lms/repositories/question-repository";
import { countQuizzesUsingQuestion } from "@/lms/repositories/quiz-repository";
import { QuestionTypeBadge, SubjectTag } from "@/components/ui/badges";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Modal from "@/components/ui/modal";
import { EmptyState, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import QuestionEditor from "./question-editor";
import QuestionPreview from "./question-preview";

type TypeFilter = QuestionType | "all";

export default function QuestionBank() {
    const hydrated = useHydrated();
    const questions = useQuestions();
    const quizzes = useQuizzes();

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [subject, setSubject] = useState("");
    const [editing, setEditing] = useState<QuestionDraft | null>(null);
    const [previewing, setPreviewing] = useState<Question | null>(null);
    const [deleting, setDeleting] = useState<Question | null>(null);

    const subjects = useMemo(() => listSubjects(questions), [questions]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return questions
            .filter((q) => typeFilter === "all" || q.type === typeFilter)
            .filter((q) => !subject || q.subject === subject)
            .filter(
                (q) =>
                    !needle ||
                    q.text.toLowerCase().includes(needle) ||
                    describeCorrectAnswer(q).toLowerCase().includes(needle)
            )
            .slice()
            .reverse(); // newest first
    }, [questions, typeFilter, subject, search]);

    const countFor = (type: TypeFilter) =>
        type === "all" ? questions.length : questions.filter((q) => q.type === type).length;

    const deletingUsage = deleting ? countQuizzesUsingQuestion(quizzes, deleting.id) : 0;

    return (
        <>
            <PageHeader
                title="Question bank"
                description="Write questions once, reuse them in any quiz. Three types: multiple choice, true/false and short answer."
                actions={
                    <PixelButton tone="sky" onClick={() => setEditing(emptyDraft())}>
                        + New question
                    </PixelButton>
                }
            />

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="🔎 Search questions or answers…"
                    className={`${inputClass} lg:max-w-sm`}
                    aria-label="Search questions"
                />
                <div className="flex flex-wrap gap-1.5">
                    {(["all", ...QUESTION_TYPE_ORDER] as TypeFilter[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setTypeFilter(type)}
                            aria-pressed={typeFilter === type}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                typeFilter === type
                                    ? "bg-amber-400 text-amber-950"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                        >
                            {type === "all" ? "All" : `${QUESTION_TYPES[type].icon} ${QUESTION_TYPES[type].shortLabel}`}{" "}
                            <span className="opacity-70">({countFor(type)})</span>
                        </button>
                    ))}
                </div>
                <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className={`${inputClass} lg:ml-auto lg:w-48`}
                    aria-label="Filter by subject"
                >
                    <option value="">All subjects</option>
                    {subjects.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            {!hydrated ? (
                <Skeleton rows={5} />
            ) : questions.length === 0 ? (
                <EmptyState
                    icon="❓"
                    title="NO QUESTIONS YET"
                    action={
                        <PixelButton tone="sky" onClick={() => setEditing(emptyDraft())}>
                            + Write your first question
                        </PixelButton>
                    }
                >
                    Questions you write here can be added to any quiz.
                </EmptyState>
            ) : filtered.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                    No questions match these filters.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {filtered.map((question) => {
                        const usage = countQuizzesUsingQuestion(quizzes, question.id);
                        return (
                            <li
                                key={question.id}
                                className="pixel-panel flex flex-col gap-3 rounded-xl bg-slate-900 p-4 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <QuestionTypeBadge type={question.type} />
                                        <SubjectTag subject={question.subject} />
                                        <span className="text-[11px] text-slate-500">
                                            {usage === 0 ? "Not in a quiz" : `In ${usage} quiz${usage === 1 ? "" : "zes"}`}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-semibold text-slate-100">{question.text}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {question.type === "multiple_choice" && (
                                            <>
                                                {question.options.length} options · ✔{" "}
                                                <span className="text-emerald-300">{describeCorrectAnswer(question)}</span>
                                            </>
                                        )}
                                        {question.type === "true_false" && (
                                            <>
                                                ✔ <span className="text-emerald-300">{describeCorrectAnswer(question)}</span>
                                            </>
                                        )}
                                        {question.type === "short_answer" && (
                                            <>
                                                Accepts: <span className="text-emerald-300">{describeCorrectAnswer(question)}</span>
                                                {question.caseSensitive && " · strict"}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                    <PixelButton tone="violet" size="sm" onClick={() => setPreviewing(question)}>
                                        👁 Try
                                    </PixelButton>
                                    <PixelButton tone="sky" size="sm" onClick={() => setEditing(draftFromQuestion(question))}>
                                        ✎ Edit
                                    </PixelButton>
                                    <PixelButton tone="slate" size="sm" onClick={() => duplicateQuestion(question.id)} title="Duplicate">
                                        ⧉
                                    </PixelButton>
                                    <PixelButton tone="rose" size="sm" onClick={() => setDeleting(question)} title="Delete">
                                        🗑
                                    </PixelButton>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <QuestionEditor draft={editing} subjects={subjects} onClose={() => setEditing(null)} />

            <Modal open={previewing !== null} title="Student view" onClose={() => setPreviewing(null)} size="lg">
                {previewing && (
                    <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#075985,#0f172a_70%)] p-3 sm:p-5">
                        <QuestionPreview key={previewing.id} question={previewing} />
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                title="Delete question?"
                danger
                confirmLabel="Delete"
                message={
                    <>
                        <p>&ldquo;{deleting?.text}&rdquo; will be removed from the bank.</p>
                        {deletingUsage > 0 && (
                            <p className="mt-2 text-amber-200">
                                It is used in {deletingUsage} quiz{deletingUsage === 1 ? "" : "zes"} and will be
                                removed from {deletingUsage === 1 ? "it" : "them"}. Past results are kept.
                            </p>
                        )}
                    </>
                }
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteQuestion(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}
