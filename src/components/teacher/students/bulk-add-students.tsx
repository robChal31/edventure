"use client";

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
    return (
        <Modal open={open} title="Paste a class list" onClose={onClose} size="lg">
            {open && (
                <Body onClose={onClose} classes={classes} schools={schools} actorIsSuper={actorIsSuper} />
            )}
        </Modal>
    );
}

function Body({ onClose, classes, schools, actorIsSuper }: Omit<Props, "open">) {
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
            <p className="text-sm text-slate-400">
                One name per line. Each student gets a login code automatically.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
                {actorIsSuper && (
                    <Field label="School">
                        <select
                            value={schoolId}
                            onChange={(e) => {
                                setSchoolId(e.target.value);
                                setClassId("");
                            }}
                            className={inputClass}
                        >
                            {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field label="Class">
                    <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
                        <option value="">No class yet</option>
                        {schoolClasses.map((klass) => (
                            <option key={klass.id} value={klass.id}>
                                {klass.name} · Grade {klass.grade}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={10}
                placeholder={"Dewi\nEko\nFajar"}
                className={inputClass}
                aria-label="Student names"
            />
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{count} student{count === 1 ? "" : "s"} ready</span>
                <div className="flex gap-2">
                    <PixelButton tone="slate" onClick={onClose}>
                        Cancel
                    </PixelButton>
                    <PixelButton tone="emerald" type="submit" disabled={count === 0 || !schoolId}>
                        ➕ Add {count || ""} students
                    </PixelButton>
                </div>
            </div>
        </form>
    );
}
