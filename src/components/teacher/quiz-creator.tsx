"use client";

import { useMemo, useState } from "react";
import type { ActivityId, Question, Quiz } from "@/quiz/types";
import { ACTIVITIES } from "@/quiz/activities";
import { SAMPLE_QUESTION_BANK } from "@/quiz/question-bank";
import { saveRoom } from "@/quiz/quiz-storage";

type QuizCreatorProps = {
    onBack: () => void;
    onPlay: (quiz: Quiz) => void;
};

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${uid++}`;

export default function QuizCreator({ onBack, onPlay }: QuizCreatorProps) {
    const [name, setName] = useState("");
    const [activityId, setActivityId] = useState<ActivityId>("fishing");
    const [selected, setSelected] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Manual question form.
    const [qText, setQText] = useState("");
    const [options, setOptions] = useState<string[]>(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(0);

    const selectedIds = useMemo(
        () => new Set(selected.map((s) => s.id)),
        [selected]
    );

    const addManualQuestion = () => {
        const filled = options.map((o) => o.trim());
        const usable = filled.filter((o) => o.length > 0);
        if (!qText.trim() || usable.length < 2) {
            setError("A question needs text and at least two answer options.");
            return;
        }
        // Normalize to exactly the filled options; clamp correct index.
        const realCorrect = filled.indexOf(filled[correctIndex] ?? "");
        setSelected((prev) => [
            ...prev,
            {
                id: nextId("custom"),
                text: qText.trim(),
                options: filled,
                correctIndex:
                    realCorrect >= 0 ? realCorrect : 0,
                subject: "Custom",
            },
        ]);
        setQText("");
        setOptions(["", "", "", ""]);
        setCorrectIndex(0);
        setError(null);
    };

    const toggleBank = (q: Question) => {
        setSelected((prev) =>
            selectedIds.has(q.id)
                ? prev.filter((s) => s.id !== q.id)
                : [...prev, q]
        );
    };

    const buildQuiz = (): Quiz | null => {
        if (!name.trim()) {
            setError("Give your room a name.");
            return null;
        }
        if (selected.length === 0) {
            setError("Add at least one question to the quiz.");
            return null;
        }
        return {
            id: nextId("room"),
            name: name.trim(),
            activityId,
            questions: selected,
        };
    };

    const handleSave = (thenPlay: boolean) => {
        const quiz = buildQuiz();
        if (!quiz) return;
        saveRoom(quiz);
        if (thenPlay) onPlay(quiz);
        else onBack();
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
            <div className="mx-auto w-full max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="font-pixel text-lg text-amber-300">
                        CREATE QUIZ ROOM
                    </h1>
                    <button
                        onClick={onBack}
                        className="pixel-btn rounded bg-slate-700 px-3 py-2 font-pixel text-[10px]"
                    >
                        ← BACK
                    </button>
                </div>

                {/* Name + activity */}
                <div className="pixel-panel mb-6 rounded-lg bg-slate-800/70 p-4">
                    <label className="font-pixel mb-2 block text-[10px] text-sky-300">
                        ROOM NAME
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Grade 4 — Science Review"
                        className="w-full rounded border-2 border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                    />

                    <div className="mt-4">
                        <span className="font-pixel mb-2 block text-[10px] text-sky-300">
                            ACTIVITY
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {ACTIVITIES.map((a) => (
                                <button
                                    key={a.id}
                                    disabled={!a.available}
                                    onClick={() => setActivityId(a.id)}
                                    className={`pixel-btn rounded px-3 py-2 font-pixel text-[10px] ${
                                        activityId === a.id
                                            ? "bg-emerald-500 text-emerald-950"
                                            : "bg-slate-700 text-slate-200"
                                    } ${!a.available ? "opacity-40" : ""}`}
                                >
                                    🎣 {a.label}
                                    {!a.available && " (soon)"}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                            {ACTIVITIES.find((a) => a.id === activityId)?.tagline}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Manual question */}
                    <div className="pixel-panel rounded-lg bg-slate-800/70 p-4">
                        <h2 className="font-pixel mb-3 text-xs text-sky-300">
                            ADD YOUR OWN QUESTION
                        </h2>
                        <input
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            placeholder="Question text"
                            className="mb-3 w-full rounded border-2 border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                        />
                        {options.map((opt, i) => (
                            <div key={i} className="mb-2 flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="correct"
                                    checked={correctIndex === i}
                                    onChange={() => setCorrectIndex(i)}
                                    className="accent-emerald-500"
                                    title="Mark as correct"
                                />
                                <input
                                    value={opt}
                                    onChange={(e) =>
                                        setOptions((prev) =>
                                            prev.map((p, j) =>
                                                j === i ? e.target.value : p
                                            )
                                        )
                                    }
                                    placeholder={`Option ${i + 1}${
                                        correctIndex === i ? " (correct)" : ""
                                    }`}
                                    className="w-full rounded border-2 border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                                />
                            </div>
                        ))}
                        <button
                            onClick={addManualQuestion}
                            className="pixel-btn mt-2 w-full rounded bg-sky-500 px-4 py-2 font-pixel text-[10px] text-sky-950"
                        >
                            + ADD QUESTION
                        </button>
                    </div>

                    {/* Bank */}
                    <div className="pixel-panel rounded-lg bg-slate-800/70 p-4">
                        <h2 className="font-pixel mb-3 text-xs text-sky-300">
                            QUESTION BANK
                        </h2>
                        <div className="max-h-72 overflow-y-auto pr-1">
                            <ul className="flex flex-col gap-2">
                                {SAMPLE_QUESTION_BANK.map((q) => (
                                    <li key={q.id}>
                                        <button
                                            onClick={() => toggleBank(q)}
                                            className={`w-full rounded border-2 px-3 py-2 text-left text-sm ${
                                                selectedIds.has(q.id)
                                                    ? "border-emerald-400 bg-emerald-500/20"
                                                    : "border-slate-600 bg-slate-900 hover:border-slate-400"
                                            }`}
                                        >
                                            <span className="mr-2 text-[10px] uppercase text-sky-400">
                                                {q.subject}
                                            </span>
                                            {q.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Selected list */}
                <div className="pixel-panel mt-6 rounded-lg bg-slate-800/70 p-4">
                    <h2 className="font-pixel mb-3 text-xs text-sky-300">
                        SELECTED QUESTIONS ({selected.length})
                    </h2>
                    {selected.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            Nothing selected yet.
                        </p>
                    ) : (
                        <ol className="flex flex-col gap-2">
                            {selected.map((q, i) => (
                                <li
                                    key={q.id}
                                    className="flex items-center justify-between rounded bg-slate-900 px-3 py-2 text-sm"
                                >
                                    <span>
                                        <span className="mr-2 font-pixel text-[10px] text-amber-300">
                                            {i + 1}.
                                        </span>
                                        {q.text}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setSelected((prev) =>
                                                prev.filter((s) => s.id !== q.id)
                                            )
                                        }
                                        className="ml-2 text-rose-400 hover:text-rose-300"
                                        aria-label="Remove"
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {error && (
                    <p className="mt-4 rounded border-2 border-rose-500 bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        className="pixel-btn rounded bg-slate-600 px-5 py-3 font-pixel text-xs"
                    >
                        SAVE ROOM
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        className="pixel-btn rounded bg-emerald-500 px-5 py-3 font-pixel text-xs text-emerald-950"
                    >
                        SAVE & PLAY 🎣
                    </button>
                </div>
            </div>
        </div>
    );
}
