"use client";

import { useMemo, useState } from "react";
import { canManageRoster, isSuperAdmin, visibleClasses, visibleStudents } from "@/lms/access";
import {
    useClasses,
    useHydrated,
    useSchools,
    useSignedInStaff,
    useStaff,
    useStudents,
} from "@/lms/hooks";
import {
    deleteClass,
    saveClass,
    validateClassDraft,
    type ClassDraft,
} from "@/lms/repositories/organisation-repository";
import { GRADES } from "@/quiz/taxonomy";
import type { SchoolClass } from "@/lms/types";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Modal from "@/components/ui/modal";
import { EmptyState, ErrorList, Field, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

export default function ClassesManager() {
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const classes = useClasses();
    const schools = useSchools();
    const students = useStudents();
    const staff = useStaff();

    const [schoolFilter, setSchoolFilter] = useState("");
    const [editing, setEditing] = useState<ClassDraft | null>(null);
    const [deleting, setDeleting] = useState<SchoolClass | null>(null);

    const scoped = useMemo(
        () =>
            visibleClasses(actor, classes)
                .filter((c) => !schoolFilter || c.schoolId === schoolFilter)
                .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)),
        [actor, classes, schoolFilter]
    );

    if (!hydrated || !actor) return <Skeleton rows={3} />;

    const canEdit = canManageRoster(actor);
    const scopedStudents = visibleStudents(actor, students);
    const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? "—";

    return (
        <>
            <PageHeader
                title="Classes"
                description={
                    canEdit
                        ? "Classes group students and decide which teacher sees whom. Students are added on the Students page."
                        : "The classes you teach and their students."
                }
                actions={
                    canEdit ? (
                        <PixelButton
                            tone="amber"
                            onClick={() =>
                                setEditing({
                                    schoolId: isSuperAdmin(actor) ? (schools[0]?.id ?? "") : (actor.schoolId ?? ""),
                                    name: "",
                                    grade: 4,
                                })
                            }
                        >
                            + New class
                        </PixelButton>
                    ) : null
                }
            />

            {isSuperAdmin(actor) && schools.length > 0 && (
                <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className={`${inputClass} mb-4 sm:w-64`}
                    aria-label="Filter by school"
                >
                    <option value="">All schools</option>
                    {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            )}

            {scoped.length === 0 ? (
                <EmptyState icon="🧺" title="NO CLASSES YET">
                    {canEdit ? "Create a class such as 4A, then add students to it." : "No classes are assigned to you yet."}
                </EmptyState>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {scoped.map((klass) => {
                        const members = scopedStudents.filter((s) => s.classId === klass.id);
                        const teachers = staff.filter(
                            (u) => u.role === "teacher" && u.classIds.includes(klass.id)
                        );
                        return (
                            <article key={klass.id} className="pixel-panel flex flex-col rounded-xl bg-slate-900 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-pixel text-sm text-amber-200">{klass.name}</h2>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Grade {klass.grade}
                                            {isSuperAdmin(actor) && ` · ${schoolName(klass.schoolId)}`}
                                        </p>
                                    </div>
                                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs tabular-nums text-slate-300">
                                        {members.length} student{members.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                <p className="mt-3 text-xs text-slate-400">
                                    <span className="font-semibold text-slate-300">Teachers: </span>
                                    {teachers.length ? teachers.map((t) => t.name).join(", ") : "none yet"}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    {members.length ? members.map((m) => `${m.avatar} ${m.name}`).join(" · ") : "No students"}
                                </p>

                                {canEdit && (
                                    <div className="mt-4 flex justify-end gap-1.5">
                                        <PixelButton tone="sky" size="sm" onClick={() => setEditing({ ...klass })}>
                                            ✎ Edit
                                        </PixelButton>
                                        <PixelButton tone="rose" size="sm" onClick={() => setDeleting(klass)}>
                                            🗑
                                        </PixelButton>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            <ClassEditor draft={editing} onClose={() => setEditing(null)} schoolsAvailable={schools} actorIsSuper={isSuperAdmin(actor)} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete class?"
                danger
                confirmLabel="Delete class"
                message={
                    <p>
                        {deleting?.name} will be removed. Its students stay in the school but without a class, and
                        quizzes assigned to this class lose it.
                    </p>
                }
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteClass(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}

function ClassEditor({
    draft,
    onClose,
    schoolsAvailable,
    actorIsSuper,
}: {
    draft: ClassDraft | null;
    onClose: () => void;
    schoolsAvailable: readonly { id: string; name: string }[];
    actorIsSuper: boolean;
}) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit class" : "New class"} onClose={onClose}>
            {draft && (
                <ClassForm
                    key={draft.id ?? "new"}
                    initial={draft}
                    onClose={onClose}
                    schools={schoolsAvailable}
                    actorIsSuper={actorIsSuper}
                />
            )}
        </Modal>
    );
}

function ClassForm({
    initial,
    onClose,
    schools,
    actorIsSuper,
}: {
    initial: ClassDraft;
    onClose: () => void;
    schools: readonly { id: string; name: string }[];
    actorIsSuper: boolean;
}) {
    const [draft, setDraft] = useState(initial);
    const [errors, setErrors] = useState<string[]>([]);

    const save = () => {
        const problems = validateClassDraft(draft);
        if (problems.length) return setErrors(problems);
        saveClass(draft);
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
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Class name" hint="e.g. 4A">
                    <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className={inputClass}
                        autoFocus
                    />
                </Field>
                <Field label="Grade">
                    <select
                        value={draft.grade}
                        onChange={(e) => setDraft({ ...draft, grade: Number(e.target.value) })}
                        className={inputClass}
                    >
                        {GRADES.map((g) => (
                            <option key={g} value={g}>
                                Grade {g}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            {actorIsSuper && (
                <Field label="School">
                    <select
                        value={draft.schoolId}
                        onChange={(e) => setDraft({ ...draft, schoolId: e.target.value })}
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
            <ErrorList errors={errors} />
            <div className="flex justify-end gap-2">
                <PixelButton tone="slate" onClick={onClose}>Cancel</PixelButton>
                <PixelButton tone="emerald" type="submit">💾 Save class</PixelButton>
            </div>
        </form>
    );
}
