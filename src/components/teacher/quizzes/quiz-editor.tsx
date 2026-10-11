"use client";

import { useState } from "react";
import { ACTIVITIES, getActivity } from "@/quiz/activities";
import { emptyDraft, type QuestionDraft } from "@/quiz/question-types";
import type { ActivityId, Question } from "@/quiz/types";
import { useQuestions, useStudents } from "@/lms/hooks";
import { listSubjects } from "@/lms/repositories/question-repository";
import { saveQuiz, validateQuizDraft, type QuizDraft } from "@/lms/repositories/quiz-repository";
import Modal from "@/components/ui/modal";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import QuestionEditor from "../questions/question-editor";
import AssignmentPicker from "./assignment-picker";
import QuestionPicker from "./question-picker";

type QuizEditorProps = {
    draft: QuizDraft | null;
    onClose: () => void;
};

export default function QuizEditor({ draft, onClose }: QuizEditorProps) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit quiz" : "New quiz"} onClose={onClose} size="xl">
            {draft && <EditorForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
        </Modal>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    hint: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-800 px-3 py-2 hover:border-slate-600">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-400"
            />
            <span>
                <span className="block text-sm font-semibold text-slate-100">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
            </span>
        </label>
    );
}

function EditorForm({ initial, onClose }: { initial: QuizDraft; onClose: () => void }) {
    const questions = useQuestions();
    const students = useStudents();
    const [draft, setDraft] = useState<QuizDraft>(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState<QuestionDraft | null>(null);

    const patch = (changes: Partial<QuizDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
    };

    const save = () => {
        const problems = validateQuizDraft(draft);
        if (problems.length > 0) {
            setErrors(problems);
            return;
        }
        saveQuiz(draft);
        onClose();
    };

    const activity = getActivity(draft.activityId);

    return (
        <>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    save();
                }}
            >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="flex flex-col gap-4">
                        <Field label="Quiz name">
                            <input
                                value={draft.name}
                                onChange={(event) => patch({ name: event.target.value })}
                                placeholder="e.g. Ocean Explorers"
                                className={inputClass}
                                autoFocus
                            />
                        </Field>
                        <Field label="Description" hint="Shown on the student's quest board.">
                            <textarea
                                value={draft.description}
                                onChange={(event) => patch({ description: event.target.value })}
                                rows={2}
                                placeholder="What is this quest about?"
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Activity" hint={`Students travel to the ${activity.location.toLowerCase()} to play. ${activity.tagline}`}>
                            <select
                                value={draft.activityId}
                                onChange={(event) => patch({ activityId: event.target.value as ActivityId })}
                                className={inputClass}
                            >
                                {ACTIVITIES.filter((a) => a.available).map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.icon} {a.label} — {a.location}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Toggle
                            checked={draft.published}
                            onChange={(published) => patch({ published })}
                            label="Published"
                            hint="Visible on assigned students' quest boards. Untick to keep it as a draft."
                        />
                        <Toggle
                            checked={draft.shuffleQuestions}
                            onChange={(shuffleQuestions) => patch({ shuffleQuestions })}
                            label="Shuffle questions"
                            hint="Every play-through asks the questions in a new order."
                        />

                        <AssignmentPicker
                            assignment={draft.assignment}
                            students={students}
                            onChange={(assignment) => patch({ assignment })}
                        />
                    </div>

                    <QuestionPicker
                        questions={questions}
                        selectedIds={draft.questionIds}
                        onChange={(questionIds) => patch({ questionIds })}
                        onCreateNew={() => setNewQuestion(emptyDraft())}
                    />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t-2 border-slate-800 pt-4">
                    <ErrorList errors={errors} />
                    <div className="flex justify-end gap-2">
                        <PixelButton tone="slate" onClick={onClose}>
                            Cancel
                        </PixelButton>
                        <PixelButton tone="emerald" type="submit">
                            💾 Save quiz
                        </PixelButton>
                    </div>
                </div>
            </form>

            {/* Sibling of the quiz form: the question editor has its own form. */}
            <QuestionEditor
                draft={newQuestion}
                subjects={listSubjects(questions)}
                onClose={() => setNewQuestion(null)}
                onSaved={(question: Question) =>
                    patch({ questionIds: [...draft.questionIds, question.id] })
                }
            />
        </>
    );
}
