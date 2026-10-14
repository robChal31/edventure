"use client";

import type { QuizAssignment, SchoolClass, Student } from "@/lms/types";

type Props = {
    assignment: QuizAssignment;
    /** Students the author may assign to (already scoped). */
    students: readonly Student[];
    /** Classes the author may assign to (already scoped). */
    classes: readonly SchoolClass[];
    /** What "everyone" covers, e.g. "Everyone in SD Harapan Bangsa". */
    everyoneLabel: string;
    onChange: (assignment: QuizAssignment) => void;
};

type Mode = QuizAssignment["mode"];

const MODES: { mode: Mode; label: string; hint: string }[] = [
    { mode: "everyone", label: "🌍 Everyone", hint: "All students in scope, including new ones" },
    { mode: "classes", label: "🧺 Classes", hint: "Every student of the chosen classes" },
    { mode: "students", label: "🎯 Students", hint: "Hand-pick individual students" },
];

function groupByClass(students: readonly Student[]): Array<[string, Student[]]> {
    const groups = new Map<string, Student[]>();
    students.forEach((student) => {
        const key = student.className || "No class";
        groups.set(key, [...(groups.get(key) ?? []), student]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function AssignmentPicker({ assignment, students, classes, everyoneLabel, onChange }: Props) {
    const selectedStudents = new Set(assignment.mode === "students" ? assignment.studentIds : []);
    const selectedClasses = new Set(assignment.mode === "classes" ? assignment.classIds : []);

    const setMode = (mode: Mode) => {
        if (mode === "everyone") onChange({ mode });
        else if (mode === "classes") onChange({ mode, classIds: assignment.mode === "classes" ? assignment.classIds : [] });
        else onChange({ mode, studentIds: assignment.mode === "students" ? assignment.studentIds : [] });
    };

    const toggleStudent = (id: string) => {
        const next = new Set(selectedStudents);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange({ mode: "students", studentIds: Array.from(next) });
    };

    const toggleGroup = (group: Student[]) => {
        const next = new Set(selectedStudents);
        const allIn = group.every((student) => next.has(student.id));
        group.forEach((student) => (allIn ? next.delete(student.id) : next.add(student.id)));
        onChange({ mode: "students", studentIds: Array.from(next) });
    };

    const toggleClass = (id: string) => {
        const next = new Set(selectedClasses);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange({ mode: "classes", classIds: Array.from(next) });
    };

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Who can play it?</legend>

            <div className="grid grid-cols-3 gap-2">
                {MODES.map((option) => {
                    const active = assignment.mode === option.mode;
                    return (
                        <button
                            key={option.mode}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setMode(option.mode)}
                            className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                                active ? "border-amber-400 bg-amber-400/15" : "border-slate-700 hover:border-slate-500"
                            }`}
                        >
                            <div className="text-sm font-bold text-slate-100">{option.label}</div>
                            <div className="text-[11px] text-slate-400">{option.hint}</div>
                        </button>
                    );
                })}
            </div>

            {assignment.mode === "everyone" && <p className="text-xs text-slate-500">{everyoneLabel}</p>}

            {assignment.mode === "classes" && (
                <div className="mt-1 flex flex-wrap gap-2 rounded-xl border-2 border-slate-800 p-2">
                    {classes.length === 0 ? (
                        <p className="p-2 text-sm text-slate-500">No classes yet — create them on the Classes page.</p>
                    ) : (
                        classes.map((klass) => {
                            const on = selectedClasses.has(klass.id);
                            const count = students.filter((s) => s.classId === klass.id).length;
                            return (
                                <button
                                    key={klass.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleClass(klass.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                        on ? "bg-emerald-400 text-emerald-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    }`}
                                >
                                    {klass.name} <span className="opacity-70">({count})</span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {assignment.mode === "students" && (
                <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border-2 border-slate-800 p-2">
                    {students.length === 0 ? (
                        <p className="p-2 text-sm text-slate-500">No students yet — add them on the Students page.</p>
                    ) : (
                        groupByClass(students).map(([className, group]) => {
                            const allIn = group.every((student) => selectedStudents.has(student.id));
                            return (
                                <div key={className} className="mb-2 last:mb-0">
                                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-bold uppercase tracking-wide text-sky-300 hover:bg-slate-800">
                                        <input type="checkbox" checked={allIn} onChange={() => toggleGroup(group)} className="h-4 w-4 accent-amber-400" />
                                        {className} ({group.length})
                                    </label>
                                    <div className="grid gap-0.5 pl-5 sm:grid-cols-2">
                                        {group.map((student) => (
                                            <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-800">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.has(student.id)}
                                                    onChange={() => toggleStudent(student.id)}
                                                    className="h-4 w-4 accent-amber-400"
                                                />
                                                <span aria-hidden>{student.avatar}</span>
                                                {student.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </fieldset>
    );
}
