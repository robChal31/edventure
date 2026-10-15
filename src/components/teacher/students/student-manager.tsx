"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Student } from "@/lms/types";
import { canManageRoster, isSuperAdmin, visibleClasses, visibleStudents } from "@/lms/access";
import { useAttempts, useClasses, useHydrated, useSchools, useSignedInStaff, useStudents } from "@/lms/hooks";
import {
    deleteStudent,
    emptyStudentDraft,
    regenerateStudentCode,
    type StudentDraft,
} from "@/lms/repositories/student-repository";
import { attemptStats, formatRelative } from "@/lms/services/reports";
import { schoolName } from "@/lms/repositories/organisation-repository";
import { ScorePill } from "@/components/ui/badges";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { EmptyState, inputClass, PageHeader, Skeleton } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import BulkAddStudents from "./bulk-add-students";
import StudentEditor from "./student-editor";

export default function StudentManager() {
    const hydrated = useHydrated();
    const actor = useSignedInStaff();
    const allStudents = useStudents();
    const attempts = useAttempts();
    const schools = useSchools();
    const allClasses = useClasses();

    const students = useMemo(() => visibleStudents(actor, allStudents), [actor, allStudents]);
    const classes = useMemo(() => visibleClasses(actor, allClasses), [actor, allClasses]);
    const canEdit = canManageRoster(actor);

    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [editing, setEditing] = useState<StudentDraft | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [deleting, setDeleting] = useState<Student | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const filtered = students
        .filter((s) => !classFilter || s.classId === classFilter)
        .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice()
        .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

    const defaultTarget = {
        schoolId: isSuperAdmin(actor) ? (schools[0]?.id ?? null) : (actor?.schoolId ?? null),
        classId: null as string | null,
    };

    const copyCode = async (student: Student) => {
        try {
            await navigator.clipboard.writeText(student.code);
            setCopied(student.id);
            setTimeout(() => setCopied((id) => (id === student.id ? null : id)), 1500);
        } catch {
            // Clipboard blocked — the code is visible anyway.
        }
    };

    const deletingAttempts = deleting ? attempts.filter((a) => a.studentId === deleting.id).length : 0;

    return (
        <>
            <PageHeader
                title="Students"
                description="Each student logs in at /student with their code. Results show up in their report."
                actions={
                    canEdit ? (
                        <>
                            <PixelButton tone="slate" onClick={() => setBulkOpen(true)}>
                                ⇪ Paste a class list
                            </PixelButton>
                            <PixelButton tone="emerald" onClick={() => setEditing(emptyStudentDraft(defaultTarget.schoolId, null))}>
                                + Add student
                            </PixelButton>
                        </>
                    ) : null
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔎 Search by name…"
                    className={`${inputClass} sm:max-w-xs`}
                    aria-label="Search students"
                />
                <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className={`${inputClass} sm:w-44`}
                    aria-label="Filter by class"
                >
                    <option value="">All classes</option>
                    {classes.map((klass) => (
                        <option key={klass.id} value={klass.id}>
                            Class {klass.name}
                        </option>
                    ))}
                </select>
            </div>

            {!hydrated ? (
                <Skeleton rows={4} />
            ) : students.length === 0 ? (
                <EmptyState
                    icon="🧒"
                    title="NO STUDENTS YET"
                    action={
                        canEdit ? (
                            <PixelButton tone="emerald" onClick={() => setEditing(emptyStudentDraft(defaultTarget.schoolId, null))}>
                                + Add your first student
                            </PixelButton>
                        ) : undefined
                    }
                >
                    {canEdit
                        ? "Add students one by one or paste a whole class list."
                        : "No students are in your classes yet. Your school admin adds them."}
                </EmptyState>
            ) : (
                <div className="overflow-x-auto rounded-xl border-2 border-slate-800">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-2.5">Student</th>
                                <th className="px-4 py-2.5">Class</th>
                                <th className="px-4 py-2.5">Login code</th>
                                <th className="px-4 py-2.5">Quizzes done</th>
                                <th className="px-4 py-2.5">Average</th>
                                <th className="px-4 py-2.5">Last played</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtered.map((student) => {
                                const own = attempts.filter((a) => a.studentId === student.id);
                                const stats = attemptStats(own);
                                const quizzesDone = new Set(own.map((a) => a.quizId)).size;

                                return (
                                    <tr key={student.id} className="hover:bg-slate-900/60">
                                        <td className="px-4 py-2.5">
                                            <Link href={`/teacher/students/${student.id}`} className="flex items-center gap-2 font-semibold text-slate-100 hover:text-amber-300">
                                                <span className="text-xl" aria-hidden>{student.avatar}</span>
                                                {student.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-300">
                                            {student.className || "—"}
                                            {isSuperAdmin(actor) && (
                                                <span className="block text-[11px] text-slate-500">{schoolName(student.schoolId)}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <code className="rounded bg-slate-800 px-2 py-1 font-pixel text-[10px] tracking-widest text-amber-300">
                                                    {student.code}
                                                </code>
                                                <button type="button" onClick={() => copyCode(student)} className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-800" title="Copy code">
                                                    {copied === student.id ? "✔" : "⧉"}
                                                </button>
                                                {canEdit && (
                                                    <button type="button" onClick={() => regenerateStudentCode(student.id)} className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-800" title="New code">
                                                        🎲
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums text-slate-300">{quizzesDone}</td>
                                        <td className="px-4 py-2.5">
                                            <ScorePill score={stats.averageScore} />
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-400">{formatRelative(stats.lastCompletedAt)}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex justify-end gap-1">
                                                <Link href={`/teacher/students/${student.id}`} className="rounded px-2 py-1 text-xs font-semibold text-sky-300 hover:bg-slate-800">
                                                    Report
                                                </Link>
                                                {canEdit && (<>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing({ ...student })}
                                                    className="rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(student)}
                                                    className="rounded px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-slate-800"
                                                >
                                                    Delete
                                                </button>
                                                </>)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <StudentEditor draft={editing} classes={classes} schools={schools} actorIsSuper={isSuperAdmin(actor)} onClose={() => setEditing(null)} />
            <BulkAddStudents open={bulkOpen} onClose={() => setBulkOpen(false)} classes={classes} schools={schools} actorIsSuper={isSuperAdmin(actor)} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete student?"
                danger
                confirmLabel="Delete"
                message={
                    <p>
                        {deleting?.avatar} {deleting?.name} will be removed
                        {deletingAttempts > 0
                            ? ` together with ${deletingAttempts} quiz attempt${deletingAttempts === 1 ? "" : "s"}`
                            : ""}
                        . This can&apos;t be undone.
                    </p>
                }
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    if (deleting) deleteStudent(deleting.id);
                    setDeleting(null);
                }}
            />
        </>
    );
}
