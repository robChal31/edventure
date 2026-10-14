"use client";

import { useMemo, useState } from "react";
import { describeCorrectAnswer } from "@/quiz/grading";
import {
    authoringSchoolId,
    canEditOwned,
    canAuthorContent,
    visibleQuestions,
    visibleQuizzes,
} from "@/lms/access";
import {
    draftFromQuestion,
    emptyDraft,
    QUESTION_TYPE_ORDER,
    QUESTION_TYPES,
    type QuestionDraft,
} from "@/quiz/question-types";
import { CURRICULA, CURRICULUM_ORDER, DIFFICULTIES, GRADES, classificationSummary, type CurriculumId, type Difficulty } from "@/quiz/taxonomy";
import type { Question, QuestionType } from "@/quiz/types";
import { useHydrated, useQuestions, useQuizzes, useSignedInStaff } from "@/lms/hooks";
import {
    copyQuestionTo,
    deleteQuestion,
    duplicateQuestion,
    isUnlabelled,
    listSubjects,
    listTopics,
} from "@/lms/repositories/question-repository";
import { countQuizzesUsingQuestion } from "@/lms/repositories/quiz-repository";
import { schoolName } from "@/lms/repositories/organisation-repository";
import { ChipTag, QuestionTypeBadge } from "@/components/ui/badges";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Modal from "@/components/ui/modal";
import { EmptyState, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import QuestionEditor from "./question-editor";
import QuestionPreview from "./question-preview";

type TypeFilter = QuestionType | "all";
type OwnerFilter = "all" | "global" | "school";

export default function QuestionBank() {
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const allQuestions = useQuestions();
    const allQuizzes = useQuizzes();

    const questions = useMemo(() => visibleQuestions(actor, allQuestions), [actor, allQuestions]);
    const quizzes = useMemo(() => visibleQuizzes(actor, allQuizzes), [actor, allQuizzes]);
    const subjects = useMemo(() => listSubjects(questions), [questions]);
    const topics = useMemo(() => listTopics(questions), [questions]);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [grade, setGrade] = useState("");
    const [subject, setSubject] = useState("");
    const [curriculum, setCurriculum] = useState<CurriculumId | "">("");
    const [difficulty, setDifficulty] = useState<Difficulty | "">("");
    const [owner, setOwner] = useState<OwnerFilter>("all");
    const [onlyUnlabelled, setOnlyUnlabelled] = useState(false);

    const [editing, setEditing] = useState<QuestionDraft | null>(null);
    const [previewing, setPreviewing] = useState<Question | null>(null);
    const [deleting, setDeleting] = useState<Question | null>(null);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return questions
            .filter((q) => typeFilter === "all" || q.type === typeFilter)
            .filter((q) => !grade || q.grade === Number(grade))
            .filter((q) => !subject || q.subject === subject)
            .filter((q) => !curriculum || q.curriculum === curriculum)
            .filter((q) => !difficulty || q.difficulty === difficulty)
            .filter((q) => owner === "all" || (owner === "global" ? q.schoolId === null : q.schoolId !== null))
            .filter((q) => !onlyUnlabelled || isUnlabelled(q))
            .filter(
                (q) =>
                    !needle ||
                    q.text.toLowerCase().includes(needle) ||
                    (q.topic ?? "").toLowerCase().includes(needle) ||
                    (q.tags ?? []).some((tag) => tag.includes(needle)) ||
                    describeCorrectAnswer(q).toLowerCase().includes(needle)
            )
            .slice()
            .reverse(); // newest first
    }, [questions, typeFilter, grade, subject, curriculum, difficulty, owner, onlyUnlabelled, search]);

    const countFor = (type: TypeFilter) =>
        type === "all" ? questions.length : questions.filter((q) => q.type === type).length;

    const unlabelledCount = questions.filter(isUnlabelled).length;
    const deletingUsage = deleting ? countQuizzesUsingQuestion(quizzes, deleting.id) : 0;
    const authorSchool = authoringSchoolId(actor);
    const canAuthor = canAuthorContent(actor);
    const ownerName = (q: Question) => (q.schoolId === null ? "Global bank" : schoolName(q.schoolId));

    const newQuestion = () => {
        const draft = emptyDraft();
        setEditing({ ...draft, schoolId: authorSchool });
    };

    return (
        <>
            <PageHeader
                title="Question bank"
                description="Questions are labelled by grade, subject, topic, curriculum and difficulty, so they are easy to find and report on. The global bank is shared by everyone."
                actions={
                    canAuthor ? (
                        <PixelButton tone="sky" onClick={newQuestion}>
                            + New question
                        </PixelButton>
                    ) : null
                }
            />

            {unlabelledCount > 0 && (
                <button
                    type="button"
                    onClick={() => setOnlyUnlabelled((v) => !v)}
                    aria-pressed={onlyUnlabelled}
                    className={`mb-4 w-full rounded-lg border-2 px-4 py-2 text-left text-sm transition ${
                        onlyUnlabelled
                            ? "border-amber-400 bg-amber-400/15 text-amber-100"
                            : "border-amber-700/60 bg-amber-950/30 text-amber-200 hover:border-amber-600"
                    }`}
                >
                    ⚠ {unlabelledCount} question{unlabelledCount === 1 ? " is" : "s are"} missing labels (grade, subject, topic or curriculum).{" "}
                    <span className="underline">{onlyUnlabelled ? "Show all" : "Show them"}</span>
                </button>
            )}

            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="🔎 Search text, topic, tag or answer…"
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
                                typeFilter === type ? "bg-amber-400 text-amber-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                        >
                            {type === "all" ? "All" : `${QUESTION_TYPES[type].icon} ${QUESTION_TYPES[type].shortLabel}`}{" "}
                            <span className="opacity-70">({countFor(type)})</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <FilterSelect label="Grade" value={grade} onChange={setGrade}>
                    {GRADES.map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Subject" value={subject} onChange={setSubject}>
                    {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Curriculum" value={curriculum} onChange={(v) => setCurriculum(v as CurriculumId | "")}>
                    {CURRICULUM_ORDER.map((c) => (
                        <option key={c} value={c}>{CURRICULA[c].label}</option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Difficulty" value={difficulty} onChange={(v) => setDifficulty(v as Difficulty | "")}>
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                        <option key={d} value={d}>{DIFFICULTIES[d].label}</option>
                    ))}
                </FilterSelect>
                <FilterSelect label="Source" value={owner} onChange={(v) => setOwner(v as OwnerFilter)}>
                    <option value="global">Global bank</option>
                    <option value="school">{actor?.role === "super_admin" ? "Schools" : "My school"}</option>
                </FilterSelect>
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={() => {
                            setGrade("");
                            setSubject("");
                            setCurriculum("");
                            setDifficulty("");
                            setOwner("all");
                            setOnlyUnlabelled(false);
                            setSearch("");
                            setTypeFilter("all");
                        }}
                        className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            {!hydrated ? (
                <Skeleton rows={5} />
            ) : questions.length === 0 ? (
                <EmptyState
                    icon="❓"
                    title="NO QUESTIONS YET"
                    action={
                        canAuthor ? (
                            <PixelButton tone="sky" onClick={newQuestion}>
                                + Write your first question
                            </PixelButton>
                        ) : undefined
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
                        const editable = canEditOwned(actor, question.schoolId);
                        const isGlobal = question.schoolId === null;
                        return (
                            <li
                                key={question.id}
                                className="pixel-panel flex flex-col gap-3 rounded-xl bg-slate-900 p-4 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <QuestionTypeBadge type={question.type} />
                                        {question.grade !== undefined && <ChipTag tone="amber">Grade {question.grade}</ChipTag>}
                                        {question.subject && <ChipTag tone="sky">{question.subject}</ChipTag>}
                                        {question.topic && <ChipTag>{question.topic}</ChipTag>}
                                        {question.curriculum && <ChipTag tone="violet">{CURRICULA[question.curriculum].label}</ChipTag>}
                                        {question.difficulty && <ChipTag>{DIFFICULTIES[question.difficulty].icon} {DIFFICULTIES[question.difficulty].label}</ChipTag>}
                                        {isUnlabelled(question) && <ChipTag tone="rose">Needs labels</ChipTag>}
                                        <ChipTag tone={isGlobal ? "emerald" : "slate"}>{isGlobal ? "🌍 Global" : `🏫 ${ownerName(question)}`}</ChipTag>
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
                                            <>✔ <span className="text-emerald-300">{describeCorrectAnswer(question)}</span></>
                                        )}
                                        {question.type === "short_answer" && (
                                            <>
                                                Accepts: <span className="text-emerald-300">{describeCorrectAnswer(question)}</span>
                                                {question.caseSensitive && " · strict"}
                                            </>
                                        )}
                                        {question.tags?.length ? <span className="ml-2 text-slate-500">#{question.tags.join(" #")}</span> : null}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                    <PixelButton tone="violet" size="sm" onClick={() => setPreviewing(question)}>
                                        👁 Try
                                    </PixelButton>
                                    {editable ? (
                                        <>
                                            <PixelButton tone="sky" size="sm" onClick={() => setEditing(draftFromQuestion(question))}>
                                                ✎ Edit
                                            </PixelButton>
                                            <PixelButton tone="slate" size="sm" onClick={() => duplicateQuestion(question.id)} title="Duplicate">
                                                ⧉
                                            </PixelButton>
                                            <PixelButton tone="rose" size="sm" onClick={() => setDeleting(question)} title="Delete">
                                                🗑
                                            </PixelButton>
                                        </>
                                    ) : (
                                        canAuthor &&
                                        authorSchool && (
                                            <PixelButton
                                                tone="emerald"
                                                size="sm"
                                                onClick={() => copyQuestionTo(question.id, authorSchool)}
                                                title="Make a copy in your school's bank to edit"
                                            >
                                                ⧉ Copy to my school
                                            </PixelButton>
                                        )
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <QuestionEditor
                draft={editing}
                subjects={subjects}
                topics={topics}
                ownerLabel={editing ? (editing.schoolId === null ? "Global bank" : schoolName(editing.schoolId)) : undefined}
                onClose={() => setEditing(null)}
            />

            <Modal open={previewing !== null} title="Student view" onClose={() => setPreviewing(null)} size="lg">
                {previewing && (
                    <>
                        <p className="mb-3 text-xs text-slate-400">
                            {classificationSummary(previewing)}
                        </p>
                        <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#075985,#0f172a_70%)] p-3 sm:p-5">
                            <QuestionPreview key={previewing.id} question={previewing} />
                        </div>
                    </>
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

function FilterSelect({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} aria-label={`Filter by ${label.toLowerCase()}`}>
                <option value="">All</option>
                {children}
            </select>
        </label>
    );
}
