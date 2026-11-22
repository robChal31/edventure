"use client";

import FormSelect from "@/components/ui/form-select";

import { useI18n } from "@/i18n/provider";
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
    const { t } = useI18n();
    return (
        <Modal open={draft !== null} title={draft?.id ? t("Edit student") : t("Add student")} onClose={onClose}>
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
    const { t } = useI18n();
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
                <Field label={t("Name")}>
                    <input
                        value={draft.name}
                        onChange={(event) => patch({ name: event.target.value })}
                        placeholder={t("e.g. Josh")}
                        className={inputClass}
                        autoFocus
                    />
                </Field>
                {actorIsSuper ? (
                    <Field label={t("School")}>
                        <FormSelect
                            value={draft.schoolId ?? ""}
                            onValueChange={(event) => patch({ schoolId: event || null, classId: null })}
                            className="w-full"
                        >
                            <option value="">{t("Choose a school…")}</option>
                            {schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </FormSelect>
                    </Field>
                ) : null}
                <Field label={t("Class")}>
                    <FormSelect
                        value={draft.classId ?? ""}
                        onValueChange={(event) => patch({ classId: event || null })}
                        className="w-full"
                    >
                        <option value="">{t("No class yet")}</option>
                        {schoolClasses.map((klass) => (
                            <option key={klass.id} value={klass.id}>
                                {klass.name}{" "}{t("· Grade")}{" "}{klass.grade}
                            </option>
                        ))}
                    </FormSelect>
                </Field>
            </div>

            <Field label={t("Login code")} hint={t("Students type this on the student login page.")}>
                <div className="flex gap-2">
                    <input
                        value={draft.code}
                        onChange={(event) => patch({ code: event.target.value.toUpperCase() })}
                        className={`${inputClass} font-pixel tracking-widest`}
                        maxLength={16}
                    />
                    <PixelButton tone="slate" onClick={regenerate} title={t("New random code")}>
                        🎲
                    </PixelButton>
                </div>
            </Field>

            <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Avatar")}</legend>
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
                <PixelButton tone="slate" onClick={onClose}>{t("Cancel")}</PixelButton>
                <PixelButton tone="emerald" type="submit">{t("💾 Save")}</PixelButton>
            </div>
        </form>
    );
}
