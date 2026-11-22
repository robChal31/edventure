"use client";

import FormSelect from "@/components/ui/form-select";

import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import { addStudents } from "@/lms/repositories/student-repository";
import type { School, SchoolClass } from "@/lms/types";
import Modal from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

type Props = {
    open: boolean;
    onClose: () => void;
    classes: readonly SchoolClass[];
    schools: readonly School[];
    actorIsSuper: boolean;
};

export default function BulkAddStudents({ open, onClose, classes, schools, actorIsSuper }: Props) {
    const { t } = useI18n();
    return (
        <Modal open={open} title={t("Paste a class list")} onClose={onClose} size="lg">
            {open && (
                <Body onClose={onClose} classes={classes} schools={schools} actorIsSuper={actorIsSuper} />
            )}
        </Modal>
    );
}

function Body({ onClose, classes, schools, actorIsSuper }: Omit<Props, "open">) {
    const { t } = useI18n();
    const [schoolId, setSchoolId] = useState<string>(schools[0]?.id ?? "");
    const [classId, setClassId] = useState("");
    const [names, setNames] = useState("");

    const schoolClasses = classes
        .filter((klass) => klass.schoolId === schoolId)
        .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

    const count = names.split("\n").filter((line) => line.trim()).length;

    const submit = () => {
        addStudents(names.split("\n"), {
            schoolId: schoolId || null,
            classId: classId || null,
        });
        setNames("");
        onClose();
    };

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                if (count > 0 && schoolId) submit();
            }}
        >
            <p className="text-sm text-slate-400">{t("One name per line. Each student gets a login code automatically.")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
                {actorIsSuper && (
                    <Field label={t("School")}>
                        <FormSelect
                            value={schoolId}
                            onValueChange={(e) => {
                                setSchoolId(e);
                                setClassId("");
                            }}
                            className="w-full"
                        >
                            {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </FormSelect>
                    </Field>
                )}
                <Field label={t("Class")}>
                    <FormSelect value={classId} onValueChange={(e) => setClassId(e)} className="w-full">
                        <option value="">{t("No class yet")}</option>
                        {schoolClasses.map((klass) => (
                            <option key={klass.id} value={klass.id}>
                                {klass.name}{" "}{t("· Grade")}{" "}{klass.grade}
                            </option>
                        ))}
                    </FormSelect>
                </Field>
            </div>
            <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={10}
                placeholder={t("Dewi\nEko\nFajar")}
                className={inputClass}
                aria-label={t("Student names")}
            />
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{t("{count} student{suffix} ready", { count, suffix: count === 1 ? "" : "s" })}</span>
                <div className="flex gap-2">
                    <PixelButton tone="slate" onClick={onClose}>{t("Cancel")}</PixelButton>
                    <PixelButton tone="emerald" type="submit" disabled={count === 0 || !schoolId}>{t("➕ Add")}{" "}{count || ""}{" "}{t("students")}</PixelButton>
                </div>
            </div>
        </form>
    );
}
