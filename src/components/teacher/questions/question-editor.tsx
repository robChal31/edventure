"use client";

import { useI18n } from "@/i18n/provider";
import { useMemo, useState } from "react";
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
import ClassificationFields from "../classification/classification-fields";
import PixelButton from "@/components/ui/pixel-button";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import MultipleChoiceFields from "./answer-fields/multiple-choice-fields";
import ShortAnswerFields from "./answer-fields/short-answer-fields";
import TrueFalseFields from "./answer-fields/true-false-fields";
import QuestionPreview from "./question-preview";
import QuestionImageEditor from "./question-image-editor";

type QuestionEditorProps = {
    /** Initial draft (empty for new questions); null closes the editor. */
    draft: QuestionDraft | null;
    subjects: string[];
    topics?: string[];
    /** Who the question belongs to, shown in the header. */
    ownerLabel?: string;
    onClose: () => void;
    onSaved?: (question: Question) => void;
};

export default function QuestionEditor({ draft, subjects, topics = [], ownerLabel, onClose, onSaved }: QuestionEditorProps) {
    const { t } = useI18n();
    return (
        <Modal
            open={draft !== null}
            title={draft?.id ? t("Edit question") : t("New question")}
            onClose={onClose}
            size="xl"
        >
            {draft && (
                <EditorForm
                    key={draft.id ?? "new"}
                    initial={draft}
                    subjects={subjects}
                    topics={topics}
                    ownerLabel={ownerLabel}
                    onClose={onClose}
                    onSaved={onSaved}
                />
            )}
        </Modal>
    );
}

/** A question built from the draft, with placeholders where it's still empty. */
function previewQuestion(draft: QuestionDraft, t: (text: string) => string): Question {
    const question = questionFromDraft(
        {
            ...draft,
            text: draft.text.trim() || (draft.image ? "" : t("Your question will appear here…")),
            options:
                draft.options.filter((o) => o.trim()).length >= 2
                    ? draft.options
                    : [t("Option A"), t("Option B")],
            correctIndex:
                draft.options.filter((o) => o.trim()).length >= 2 ? draft.correctIndex : 0,
            acceptedAnswers: draft.acceptedAnswers.some((a) => a.trim())
                ? draft.acceptedAnswers
                : [t("answer")],
        },
        "preview",
        new Date(0).toISOString()
    );
    return question;
}

function EditorForm({
    initial,
    subjects,
    topics,
    ownerLabel,
    onClose,
    onSaved,
}: {
    initial: QuestionDraft;
    subjects: string[];
    topics: string[];
    ownerLabel?: string;
    onClose: () => void;
    onSaved?: (question: Question) => void;
}) {
    const { t } = useI18n();
    const [draft, setDraft] = useState<QuestionDraft>(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const [previewVersion, setPreviewVersion] = useState(0);
    const [imageBusy, setImageBusy] = useState(false);

    const patch = (changes: Partial<QuestionDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
        setPreviewVersion((n) => n + 1);
    };

    const preview = useMemo(() => previewQuestion(draft, t), [draft, t]);

    const save = () => {
        if (imageBusy) return;
        const problems = validateDraft(draft);
        if (problems.length > 0) {
            setErrors(problems);
            return;
        }
        try {
            const saved = saveQuestion(draft);
            onSaved?.(saved);
            onClose();
        } catch {
            setErrors(["This device could not save the question. Storage may be full. Remove an image or free some space and try again."]);
        }
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
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Question type")}</legend>
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
                                    title={t(info.description)}
                                >
                                    <span className="text-2xl" aria-hidden>{info.icon}</span>
                                    <span className="text-xs font-bold">{t(info.label)}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t(QUESTION_TYPES[draft.type].description)}</p>
                </fieldset>

                <Field label={draft.type === "true_false" ? t("Statement") : t("Question")} hint={t("Write a prompt, add an image, or use both.")}>
                    <textarea
                        value={draft.text}
                        onChange={(event) => patch({ text: event.target.value })}
                        rows={3}
                        placeholder={
                            draft.type === "true_false" ? t("e.g. A whale is a fish.") : t("e.g. What is 7 + 5?")
                        }
                        className={inputClass}
                        autoFocus
                    />
                </Field>

                <QuestionImageEditor image={draft.image} onChange={(image) => patch({ image })} onBusyChange={setImageBusy} />

                {draft.type === "multiple_choice" && <MultipleChoiceFields draft={draft} onChange={patch} />}
                {draft.type === "true_false" && <TrueFalseFields draft={draft} onChange={patch} />}
                {draft.type === "short_answer" && <ShortAnswerFields draft={draft} onChange={patch} />}

                <ClassificationFields
                    value={draft}
                    onChange={patch}
                    knownSubjects={subjects}
                    knownTopics={topics}
                />

                <Field label={t("Explanation (optional)")} hint={t("Shown after the student answers.")}>
                    <input
                        value={draft.explanation}
                        onChange={(event) => patch({ explanation: event.target.value })}
                        placeholder={t("Why is this the answer?")}
                        className={inputClass}
                    />
                </Field>

                <ErrorList errors={errors} />

                <div className="flex justify-end gap-2">
                    <PixelButton tone="slate" onClick={onClose}>{t("Cancel")}</PixelButton>
                    <PixelButton tone="emerald" type="submit" disabled={imageBusy}>{imageBusy ? t("Preparing image…") : t("💾 Save question")}</PixelButton>
                </div>
            </form>

            <div className="flex flex-col gap-2">
                {ownerLabel && (
                    <span className="text-xs text-slate-500">{t("Saved to:")}{" "}{ownerLabel}</span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Student view — try it!")}</span>
                <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#075985,#0f172a_70%)] p-3 sm:p-4">
                    <QuestionPreview key={previewVersion} question={preview} />
                </div>
            </div>
        </div>
    );
}
