"use client";

import { useId, useMemo, useState } from "react";
import {
    QUESTION_TYPE_ORDER,
    QUESTION_TYPES,
    questionFromDraft,
    validateDraft,
    type QuestionDraft,
} from "@/quiz/question-types";
import type { Question } from "@/quiz/types";
import { saveQuestion } from "@/lms/repositories/question-repository";
import Modal from "@/components/ui/modal";
import PixelButton from "@/components/ui/pixel-button";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import MultipleChoiceFields from "./answer-fields/multiple-choice-fields";
import ShortAnswerFields from "./answer-fields/short-answer-fields";
import TrueFalseFields from "./answer-fields/true-false-fields";
import QuestionPreview from "./question-preview";

type QuestionEditorProps = {
    /** Initial draft (empty for new questions); null closes the editor. */
    draft: QuestionDraft | null;
    subjects: string[];
    onClose: () => void;
    onSaved?: (question: Question) => void;
};

export default function QuestionEditor({ draft, subjects, onClose, onSaved }: QuestionEditorProps) {
    return (
        <Modal
            open={draft !== null}
            title={draft?.id ? "Edit question" : "New question"}
            onClose={onClose}
            size="xl"
        >
            {draft && (
                <EditorForm
                    key={draft.id ?? "new"}
                    initial={draft}
                    subjects={subjects}
                    onClose={onClose}
                    onSaved={onSaved}
                />
            )}
        </Modal>
    );
}

/** A question built from the draft, with placeholders where it's still empty. */
function previewQuestion(draft: QuestionDraft): Question {
    const question = questionFromDraft(
        {
            ...draft,
            text: draft.text.trim() || "Your question will appear here…",
            options:
                draft.options.filter((o) => o.trim()).length >= 2
                    ? draft.options
                    : ["Option A", "Option B"],
            correctIndex:
                draft.options.filter((o) => o.trim()).length >= 2 ? draft.correctIndex : 0,
            acceptedAnswers: draft.acceptedAnswers.some((a) => a.trim())
                ? draft.acceptedAnswers
                : ["answer"],
        },
        "preview",
        new Date(0).toISOString()
    );
    return question;
}

function EditorForm({
    initial,
    subjects,
    onClose,
    onSaved,
}: {
    initial: QuestionDraft;
    subjects: string[];
    onClose: () => void;
    onSaved?: (question: Question) => void;
}) {
    const [draft, setDraft] = useState<QuestionDraft>(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const [previewVersion, setPreviewVersion] = useState(0);
    const subjectListId = useId();

    const patch = (changes: Partial<QuestionDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
        setPreviewVersion((n) => n + 1);
    };

    const preview = useMemo(() => previewQuestion(draft), [draft]);

    const save = () => {
        const problems = validateDraft(draft);
        if (problems.length > 0) {
            setErrors(problems);
            return;
        }
        const saved = saveQuestion(draft);
        onSaved?.(saved);
        onClose();
    };

    // The preview contains its own <form> (short answers), so it must sit
    // next to the editor form, never inside it.
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    save();
                }}
            >
                <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Question type
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                        {QUESTION_TYPE_ORDER.map((type) => {
                            const info = QUESTION_TYPES[type];
                            const active = draft.type === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => patch({ type })}
                                    aria-pressed={active}
                                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition ${
                                        active
                                            ? "border-amber-400 bg-amber-400/15 text-amber-200"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                    title={info.description}
                                >
                                    <span className="text-2xl" aria-hidden>{info.icon}</span>
                                    <span className="text-xs font-bold">{info.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{QUESTION_TYPES[draft.type].description}</p>
                </fieldset>

                <Field label={draft.type === "true_false" ? "Statement" : "Question"}>
                    <textarea
                        value={draft.text}
                        onChange={(event) => patch({ text: event.target.value })}
                        rows={3}
                        placeholder={
                            draft.type === "true_false"
                                ? "e.g. A whale is a fish."
                                : "e.g. What is 7 + 5?"
                        }
                        className={inputClass}
                        autoFocus
                    />
                </Field>

                {draft.type === "multiple_choice" && <MultipleChoiceFields draft={draft} onChange={patch} />}
                {draft.type === "true_false" && <TrueFalseFields draft={draft} onChange={patch} />}
                {draft.type === "short_answer" && <ShortAnswerFields draft={draft} onChange={patch} />}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Subject" hint="Used to filter the bank.">
                        <input
                            value={draft.subject}
                            onChange={(event) => patch({ subject: event.target.value })}
                            list={subjectListId}
                            placeholder="e.g. Math"
                            className={inputClass}
                        />
                        <datalist id={subjectListId}>
                            {subjects.map((subject) => (
                                <option key={subject} value={subject} />
                            ))}
                        </datalist>
                    </Field>
                    <Field label="Explanation (optional)" hint="Shown after the student answers.">
                        <input
                            value={draft.explanation}
                            onChange={(event) => patch({ explanation: event.target.value })}
                            placeholder="Why is this the answer?"
                            className={inputClass}
                        />
                    </Field>
                </div>

                <ErrorList errors={errors} />

                <div className="flex justify-end gap-2">
                    <PixelButton tone="slate" onClick={onClose}>
                        Cancel
                    </PixelButton>
                    <PixelButton tone="emerald" type="submit">
                        💾 Save question
                    </PixelButton>
                </div>
            </form>

            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student view — try it!
                </span>
                <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#075985,#0f172a_70%)] p-3 sm:p-4">
                    <QuestionPreview key={previewVersion} question={preview} />
                </div>
            </div>
        </div>
    );
}
