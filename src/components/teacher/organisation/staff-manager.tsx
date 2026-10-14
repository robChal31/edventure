"use client";

import { useMemo, useState } from "react";
import { canEditStaff, canManageStaff, isSuperAdmin } from "@/lms/access";
import { useClasses, useHydrated, useSchools, useSignedInStaff, useStaff } from "@/lms/hooks";
import {
    deleteStaff,
    saveStaff,
    validateStaffDraft,
    type StaffDraft,
} from "@/lms/repositories/staff-repository";
import { ROLE_LABELS, type StaffRole, type StaffUser } from "@/lms/types";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Modal from "@/components/ui/modal";
import { EmptyState, ErrorList, Field, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import { NoAccess } from "./access-notice";

const ROLE_TONE: Record<StaffRole, string> = {
    super_admin: "bg-violet-500/15 text-violet-300 ring-violet-500/40",
    school_admin: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
    teacher: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
};

export default function StaffManager() {
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const staff = useStaff();
    const schools = useSchools();
    const classes = useClasses();

    const [editing, setEditing] = useState<StaffDraft | null>(null);
    const [deleting, setDeleting] = useState<StaffUser | null>(null);

    const visible = useMemo(() => {
        if (!actor) return [];
        return staff
            .filter((user) => {
                if (isSuperAdmin(actor)) return true;
                return user.schoolId === actor.schoolId;
            })
            .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
    }, [actor, staff]);

    if (!hydrated || !actor) return <Skeleton rows={3} />;
    if (!canManageStaff(actor)) {
        return <NoAccess>Teachers can&apos;t manage staff accounts. Ask your school admin.</NoAccess>;
    }

    const schoolName = (id: string | null) =>
        id ? (schools.find((s) => s.id === id)?.name ?? "—") : "All schools";

    return (
        <>
            <PageHeader
                title="Staff accounts"
                description={
                    isSuperAdmin(actor)
                        ? "Create developer, school admin and teacher accounts for every school."
                        : "Create teacher accounts for your school and choose which classes they teach."
                }
                actions={
                    <PixelButton
                        tone="amber"
                        onClick={() =>
                            setEditing({
                                role: "teacher",
                                name: "",
                                username: "",
                                password: "",
                                schoolId: isSuperAdmin(actor) ? (schools[0]?.id ?? null) : actor.schoolId,
                                classIds: [],
                            })
                        }
                    >
                        + New account
                    </PixelButton>
                }
            />

            {visible.length === 0 ? (
                <EmptyState icon="🧑‍💼" title="NO STAFF YET">
                    Add the teachers who will use the LMS.
                </EmptyState>
            ) : (
                <div className="overflow-x-auto rounded-xl border-2 border-slate-800">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-2.5">Name</th>
                                <th className="px-4 py-2.5">Role</th>
                                <th className="px-4 py-2.5">School</th>
                                <th className="px-4 py-2.5">Classes</th>
                                <th className="px-4 py-2.5">Username</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {visible.map((user) => {
                                const editable = canEditStaff(actor, user);
                                const classNames = user.classIds
                                    .map((id) => classes.find((c) => c.id === id)?.name)
                                    .filter(Boolean)
                                    .join(", ");
                                return (
                                    <tr key={user.id} className="hover:bg-slate-900/60">
                                        <td className="px-4 py-2.5 font-semibold text-slate-100">
                                            {user.name}
                                            {user.id === actor.id && (
                                                <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${ROLE_TONE[user.role]}`}>
                                                {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-300">{schoolName(user.schoolId)}</td>
                                        <td className="px-4 py-2.5 text-slate-300">{user.role === "teacher" ? classNames || "—" : "—"}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{user.username}</td>
                                        <td className="px-4 py-2.5">
                                            {editable && (
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing({ ...user, password: user.password })}
                                                        className="rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                                                    >
                                                        Edit
                                                    </button>
                                                    {user.id !== actor.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleting(user)}
                                                            className="rounded px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-slate-800"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <StaffEditor draft={editing} onClose={() => setEditing(null)} actor={actor} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete account?"
                danger
                confirmLabel="Delete"
                message={<p>{deleting?.name} will no longer be able to sign in.</p>}
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteStaff(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}

function StaffEditor({
    draft,
    onClose,
    actor,
}: {
    draft: StaffDraft | null;
    onClose: () => void;
    actor: StaffUser;
}) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit account" : "New account"} onClose={onClose} size="lg">
            {draft && <StaffForm key={draft.id ?? "new"} initial={draft} onClose={onClose} actor={actor} />}
        </Modal>
    );
}

function StaffForm({
    initial,
    onClose,
    actor,
}: {
    initial: StaffDraft;
    onClose: () => void;
    actor: StaffUser;
}) {
    const schools = useSchools();
    const classes = useClasses();
    const [draft, setDraft] = useState(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const superAdmin = isSuperAdmin(actor);

    // School admins create teachers for their own school only.
    const roles: StaffRole[] = superAdmin ? ["super_admin", "school_admin", "teacher"] : ["teacher"];
    const schoolClasses = classes
        .filter((c) => c.schoolId === draft.schoolId)
        .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

    const patch = (changes: Partial<StaffDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
    };

    const save = () => {
        const problems = validateStaffDraft(draft);
        if (problems.length) return setErrors(problems);
        saveStaff(draft);
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
                <Field label="Full name">
                    <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className={inputClass} autoFocus />
                </Field>
                <Field label="Role">
                    <select
                        value={draft.role}
                        onChange={(e) => patch({ role: e.target.value as StaffRole })}
                        className={inputClass}
                        disabled={!superAdmin && draft.id !== undefined}
                    >
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Username" hint="Lowercase, used to sign in">
                    <input value={draft.username} onChange={(e) => patch({ username: e.target.value })} className={`${inputClass} font-mono`} />
                </Field>
                <Field label="Password" hint="At least 6 characters">
                    <input value={draft.password} onChange={(e) => patch({ password: e.target.value })} className={`${inputClass} font-mono`} />
                </Field>
                {draft.role !== "super_admin" && (
                    <Field label="School">
                        <select
                            value={draft.schoolId ?? ""}
                            onChange={(e) => patch({ schoolId: e.target.value || null, classIds: [] })}
                            className={inputClass}
                            disabled={!superAdmin}
                        >
                            <option value="">Choose a school…</option>
                            {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
            </div>

            {draft.role === "teacher" && (
                <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Classes this teacher sees
                    </legend>
                    {schoolClasses.length === 0 ? (
                        <p className="text-sm text-slate-500">This school has no classes yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {schoolClasses.map((klass) => {
                                const on = draft.classIds.includes(klass.id);
                                return (
                                    <button
                                        key={klass.id}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() =>
                                            patch({
                                                classIds: on
                                                    ? draft.classIds.filter((id) => id !== klass.id)
                                                    : [...draft.classIds, klass.id],
                                            })
                                        }
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            on ? "bg-emerald-400 text-emerald-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                        }`}
                                    >
                                        {klass.name} · Grade {klass.grade}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </fieldset>
            )}

            <ErrorList errors={errors} />
            <div className="flex justify-end gap-2">
                <PixelButton tone="slate" onClick={onClose}>Cancel</PixelButton>
                <PixelButton tone="emerald" type="submit">💾 Save account</PixelButton>
            </div>
        </form>
    );
}
