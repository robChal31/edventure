"use client";

import { useState } from "react";
import {
    generateStudentCode,
    saveStudent,
    STUDENT_AVATARS,
    studentStore,
    validateStudentDraft,
    type StudentDraft,
} from "@/lms/repositories/student-repository";
import Modal from "@/components/ui/modal";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

type Props = {
    draft: StudentDraft | null;
    classNames: string[];
    onClose: () => void;
};

export default function StudentEditor({ draft, classNames, onClose }: Props) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit student" : "Add student"} onClose={onClose}>
            {draft && <Form key={draft.id ?? "new"} initial={draft} classNames={classNames} onClose={onClose} />}
        </Modal>
    );
}

function Form({
    initial,
    classNames,
    onClose,
}: {
    initial: StudentDraft;
    classNames: string[];
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const [errors, setErrors] = useState<string[]>([]);

    const patch = (changes: Partial<StudentDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
    };

    const save = () => {
        const problems = validateStudentDraft(draft);
        if (problems.length > 0) {
            setErrors(problems);
            return;
        }
        saveStudent(draft);
        onClose();
    };

    const regenerate = () => {
        const taken = new Set(
            studentStore
                .getSnapshot()
                .filter((s) => s.id !== draft.id)
                .map((s) => s.code)
        );
        patch({ code: generateStudentCode(taken) });
    };

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                    <input
                        value={draft.name}
                        onChange={(event) => patch({ name: event.target.value })}
                        placeholder="e.g. Ani"
                        className={inputClass}
                        autoFocus
                    />
                </Field>
                <Field label="Class">
                    <input
                        value={draft.className}
                        onChange={(event) => patch({ className: event.target.value })}
                        placeholder="e.g. 4A"
                        list="student-class-names"
                        className={inputClass}
                    />
                    <datalist id="student-class-names">
                        {classNames.map((name) => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>
                </Field>
            </div>

            <Field label="Login code" hint="Students type this on the student login page.">
                <div className="flex gap-2">
                    <input
                        value={draft.code}
                        onChange={(event) => patch({ code: event.target.value.toUpperCase() })}
                        className={`${inputClass} font-pixel tracking-widest`}
                        maxLength={16}
                    />
                    <PixelButton tone="slate" onClick={regenerate} title="New random code">
                        🎲
                    </PixelButton>
                </div>
            </Field>

            <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Avatar</legend>
                <div className="flex flex-wrap gap-2">
                    {STUDENT_AVATARS.map((avatar) => (
                        <button
                            key={avatar}
                            type="button"
                            onClick={() => patch({ avatar })}
                            aria-pressed={draft.avatar === avatar}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${
                                draft.avatar === avatar
                                    ? "bg-amber-400/25 ring-2 ring-amber-400"
                                    : "bg-slate-800 hover:bg-slate-700"
                            }`}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
            </fieldset>

            <ErrorList errors={errors} />

            <div className="flex justify-end gap-2">
                <PixelButton tone="slate" onClick={onClose}>
                    Cancel
                </PixelButton>
                <PixelButton tone="emerald" type="submit">
                    💾 Save
                </PixelButton>
            </div>
        </form>
    );
}
