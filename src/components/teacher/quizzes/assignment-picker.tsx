"use client";

import type { QuizAssignment, Student } from "@/lms/types";

type Props = {
    assignment: QuizAssignment;
    students: readonly Student[];
    onChange: (assignment: QuizAssignment) => void;
};

function groupByClass(students: readonly Student[]): Array<[string, Student[]]> {
    const groups = new Map<string, Student[]>();
    students.forEach((student) => {
        const key = student.className || "No class";
        groups.set(key, [...(groups.get(key) ?? []), student]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function AssignmentPicker({ assignment, students, onChange }: Props) {
    const selected = new Set(assignment.mode === "students" ? assignment.studentIds : []);

    const setSelected = (ids: Set<string>) =>
        onChange({ mode: "students", studentIds: Array.from(ids) });

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleGroup = (group: Student[]) => {
        const next = new Set(selected);
        const allIn = group.every((student) => next.has(student.id));
        group.forEach((student) => (allIn ? next.delete(student.id) : next.add(student.id)));
        setSelected(next);
    };

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Who can play it?
            </legend>

            <div className="grid grid-cols-2 gap-2">
                {[
                    { mode: "everyone" as const, label: "🌍 Everyone", hint: "All students, including new ones" },
                    { mode: "students" as const, label: "🎯 Selected", hint: "Pick students or classes" },
                ].map((option) => {
                    const active = assignment.mode === option.mode;
                    return (
                        <button
                            key={option.mode}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                                onChange(
                                    option.mode === "everyone"
                                        ? { mode: "everyone" }
                                        : { mode: "students", studentIds: Array.from(selected) }
                                )
                            }
                            className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                                active
                                    ? "border-amber-400 bg-amber-400/15"
                                    : "border-slate-700 hover:border-slate-500"
                            }`}
                        >
                            <div className="text-sm font-bold text-slate-100">{option.label}</div>
                            <div className="text-[11px] text-slate-400">{option.hint}</div>
                        </button>
                    );
                })}
            </div>

            {assignment.mode === "students" && (
                <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border-2 border-slate-800 p-2">
                    {students.length === 0 ? (
                        <p className="p-2 text-sm text-slate-500">No students yet — add them on the Students page.</p>
                    ) : (
                        groupByClass(students).map(([className, group]) => {
                            const allIn = group.every((student) => selected.has(student.id));
                            return (
                                <div key={className} className="mb-2 last:mb-0">
                                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-bold uppercase tracking-wide text-sky-300 hover:bg-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={allIn}
                                            onChange={() => toggleGroup(group)}
                                            className="h-4 w-4 accent-amber-400"
                                        />
                                        {className} ({group.length})
                                    </label>
                                    <div className="grid gap-0.5 pl-5 sm:grid-cols-2">
                                        {group.map((student) => (
                                            <label
                                                key={student.id}
                                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-800"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(student.id)}
                                                    onChange={() => toggle(student.id)}
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
