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
import type { School, SchoolClass } from "@/lms/types";
import Modal from "@/components/ui/modal";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

type Props = {
    draft: StudentDraft | null;
    classes: readonly SchoolClass[];
    schools: readonly School[];
    actorIsSuper: boolean;
    onClose: () => void;
};

export default function StudentEditor({ draft, classes, schools, actorIsSuper, onClose }: Props) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit student" : "Add student"} onClose={onClose}>
            {draft && (
                <Form
                    key={draft.id ?? "new"}
                    initial={draft}
                    classes={classes}
                    schools={schools}
                    actorIsSuper={actorIsSuper}
                    onClose={onClose}
                />
            )}
        </Modal>
    );
}

function Form({
    initial,
    classes,
    schools,
    actorIsSuper,
    onClose,
}: {
    initial: StudentDraft;
    classes: readonly SchoolClass[];
    schools: readonly School[];
    actorIsSuper: boolean;
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

    const schoolClasses = classes
        .filter((klass) => klass.schoolId === draft.schoolId)
        .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

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
                {actorIsSuper ? (
                    <Field label="School">
                        <select
                            value={draft.schoolId ?? ""}
                            onChange={(event) => patch({ schoolId: event.target.value || null, classId: null })}
                            className={inputClass}
                        >
                            <option value="">Choose a school…</option>
                            {schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                ) : null}
                <Field label="Class">
                    <select
                        value={draft.classId ?? ""}
                        onChange={(event) => patch({ classId: event.target.value || null })}
                        className={inputClass}
                    >
                        <option value="">No class yet</option>
                        {schoolClasses.map((klass) => (
                            <option key={klass.id} value={klass.id}>
                                {klass.name} · Grade {klass.grade}
                            </option>
                        ))}
                    </select>
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
