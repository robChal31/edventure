"use client";

import { useMemo, useState } from "react";
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from "@/quiz/question-types";
import { GRADES, CURRICULA, type CurriculumId } from "@/quiz/taxonomy";
import type { Question, QuestionType } from "@/quiz/types";
import { ChipTag, QuestionTypeBadge } from "@/components/ui/badges";
import { inputClass } from "@/components/ui/panels";

type Props = {
    questions: readonly Question[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    onCreateNew: () => void;
};

/** Ordered list of the quiz's questions + the bank to add from. */
export default function QuestionPicker({ questions, selectedIds, onChange, onCreateNew }: Props) {
    const [search, setSearch] = useState("");
    const [type, setType] = useState<QuestionType | "all">("all");
    const [grade, setGrade] = useState("");
    const [subject, setSubject] = useState("");

    const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
    const selected = selectedIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
    const selectedSet = new Set(selectedIds);

    const subjects = Array.from(new Set(questions.map((q) => q.subject).filter(Boolean) as string[])).sort();

    const available = questions.filter((q) => {
        const needle = search.trim().toLowerCase();
        return (
            !selectedSet.has(q.id) &&
            (type === "all" || q.type === type) &&
            (!grade || q.grade === Number(grade)) &&
            (!subject || q.subject === subject) &&
            (!needle ||
                q.text.toLowerCase().includes(needle) ||
                (q.topic ?? "").toLowerCase().includes(needle) ||
                (q.subject ?? "").toLowerCase().includes(needle))
        );
    });

    const move = (index: number, delta: number) => {
        const next = selectedIds.slice();
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div className="flex flex-col gap-4">
            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        In this quiz ({selected.length}) — one fish per question
                    </h3>
                    {selected.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-xs text-slate-500 hover:text-rose-300"
                        >
                            Clear
                        </button>
                    )}
                </div>
                {selected.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                        Add questions from the bank below.
                    </p>
                ) : (
                    <ol className="flex flex-col gap-1.5">
                        {selected.map((question, index) => (
                            <li
                                key={question.id}
                                className="flex items-center gap-2 rounded-lg border-2 border-slate-800 bg-slate-950/60 px-2 py-1.5"
                            >
                                <span className="w-6 text-center font-pixel text-[9px] text-slate-500">{index + 1}</span>
                                <span title={QUESTION_TYPES[question.type].label} aria-hidden>
                                    {QUESTION_TYPES[question.type].icon}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{question.text}</span>
                                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded px-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-30" aria-label="Move up">
                                    ▲
                                </button>
                                <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="rounded px-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-30" aria-label="Move down">
                                    ▼
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange(selectedIds.filter((id) => id !== question.id))}
                                    className="rounded px-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                                    aria-label="Remove from quiz"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Question bank</h3>
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25"
                    >
                        ✎ Write a new question
                    </button>
                </div>
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="🔎 Search text or topic…"
                        className={inputClass}
                        aria-label="Search the question bank"
                    />
                    <div className="grid grid-cols-3 gap-2">
                        <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass} aria-label="Filter by grade">
                            <option value="">Any grade</option>
                            {GRADES.map((g) => (
                                <option key={g} value={g}>Grade {g}</option>
                            ))}
                        </select>
                        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} aria-label="Filter by subject">
                            <option value="">Any subject</option>
                            {subjects.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    <select
                        value={type}
                        onChange={(event) => setType(event.target.value as QuestionType | "all")}
                        className={`${inputClass} sm:w-44`}
                        aria-label="Filter by type"
                    >
                        <option value="all">All types</option>
                        {QUESTION_TYPE_ORDER.map((t) => (
                            <option key={t} value={t}>
                                {QUESTION_TYPES[t].icon} {QUESTION_TYPES[t].label}
                            </option>
                        ))}
                    </select>
                    </div>
                </div>
                <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
                    {available.length === 0 && (
                        <li className="p-3 text-center text-sm text-slate-500">Nothing else to add here.</li>
                    )}
                    {available.map((question) => (
                        <li key={question.id} className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <QuestionTypeBadge type={question.type} compact />
                                    {question.grade !== undefined && <ChipTag tone="amber">G{question.grade}</ChipTag>}
                                    {question.subject && <ChipTag tone="sky">{question.subject}</ChipTag>}
                                    {question.curriculum && <ChipTag tone="violet">{CURRICULA[question.curriculum as CurriculumId].label}</ChipTag>}
                                    {question.schoolId === null && <ChipTag tone="emerald">🌍 Global</ChipTag>}
                                </div>
                                <div className="mt-1 truncate text-sm text-slate-200">{question.text}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onChange([...selectedIds, question.id])}
                                className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400"
                            >
                                + Add
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
