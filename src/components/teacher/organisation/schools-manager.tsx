"use client";

import { useState } from "react";
import { canManageSchools } from "@/lms/access";
import { useClasses, useHydrated, useSchools, useSignedInStaff, useStaff, useStudents } from "@/lms/hooks";
import {
    deleteSchool,
    saveSchool,
    validateSchoolDraft,
    type SchoolDraft,
} from "@/lms/repositories/organisation-repository";
import type { School } from "@/lms/types";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Modal from "@/components/ui/modal";
import { ErrorList, EmptyState, Field, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import { NoAccess } from "./access-notice";

export default function SchoolsManager() {
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const schools = useSchools();
    const classes = useClasses();
    const students = useStudents();
    const staff = useStaff();

    const [editing, setEditing] = useState<SchoolDraft | null>(null);
    const [deleting, setDeleting] = useState<School | null>(null);

    if (!hydrated) return <Skeleton rows={3} />;
    if (!canManageSchools(actor)) {
        return <NoAccess>Only the developer account creates and removes schools.</NoAccess>;
    }

    const counts = (schoolId: string) => ({
        classes: classes.filter((c) => c.schoolId === schoolId).length,
        students: students.filter((s) => s.schoolId === schoolId).length,
        staff: staff.filter((s) => s.schoolId === schoolId).length,
    });

    return (
        <>
            <PageHeader
                title="Schools"
                description="Each school has its own admin, classes, teachers and students. Questions and quizzes made by a school stay in that school."
                actions={
                    <PixelButton tone="amber" onClick={() => setEditing({ name: "", code: "" })}>
                        + New school
                    </PixelButton>
                }
            />

            {schools.length === 0 ? (
                <EmptyState icon="🏫" title="NO SCHOOLS YET">
                    Create a school, then add its admin and classes.
                </EmptyState>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {schools.map((school) => {
                        const c = counts(school.id);
                        return (
                            <article key={school.id} className="pixel-panel flex flex-col rounded-xl bg-slate-900 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-bold text-slate-100">{school.name}</h2>
                                        <p className="mt-1 font-mono text-xs text-slate-500">{school.code}</p>
                                    </div>
                                </div>
                                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    <Stat label="Classes" value={c.classes} />
                                    <Stat label="Students" value={c.students} />
                                    <Stat label="Staff" value={c.staff} />
                                </dl>
                                <div className="mt-4 flex justify-end gap-1.5">
                                    <PixelButton tone="sky" size="sm" onClick={() => setEditing({ ...school })}>
                                        ✎ Edit
                                    </PixelButton>
                                    <PixelButton tone="rose" size="sm" onClick={() => setDeleting(school)}>
                                        🗑
                                    </PixelButton>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <SchoolEditor draft={editing} onClose={() => setEditing(null)} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete school?"
                danger
                confirmLabel="Delete school"
                message={
                    <p>
                        {deleting?.name} and everything in it (classes, staff accounts and students)
                        will be removed. Its questions and quizzes will also be deleted. This can&apos;t be undone.
                    </p>
                }
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteSchool(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg bg-slate-950/60 p-2">
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="font-pixel text-sm text-amber-200">{value}</dd>
        </div>
    );
}

function SchoolEditor({ draft, onClose }: { draft: SchoolDraft | null; onClose: () => void }) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit school" : "New school"} onClose={onClose}>
            {draft && <SchoolForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
        </Modal>
    );
}

function SchoolForm({ initial, onClose }: { initial: SchoolDraft; onClose: () => void }) {
    const [draft, setDraft] = useState(initial);
    const [errors, setErrors] = useState<string[]>([]);

    const save = () => {
        const problems = validateSchoolDraft(draft);
        if (problems.length) return setErrors(problems);
        saveSchool(draft);
        onClose();
    };

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <Field label="School name">
                <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. SD Harapan Bangsa"
                    className={inputClass}
                    autoFocus
                />
            </Field>
            <Field label="Short code" hint="Shown on reports, e.g. HBG">
                <input
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                    maxLength={8}
                    className={`${inputClass} font-mono`}
                />
            </Field>
            <ErrorList errors={errors} />
            <div className="flex justify-end gap-2">
                <PixelButton tone="slate" onClick={onClose}>Cancel</PixelButton>
                <PixelButton tone="emerald" type="submit">💾 Save</PixelButton>
            </div>
        </form>
    );
}
