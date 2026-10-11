"use client";

import type { Student } from "@/lms/types";

export default function StudentBadge({
    student,
    onSignOut,
}: {
    student: Student;
    onSignOut: () => void;
}) {
    return (
        <div className="pixel-panel flex items-center gap-3 rounded-xl bg-slate-900/85 py-2 pl-2 pr-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-900 text-2xl" aria-hidden>
                {student.avatar}
            </span>
            <div className="min-w-0">
                <div className="truncate font-pixel text-[10px] text-amber-300">{student.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                    {student.className && <span>Class {student.className}</span>}
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onSignOut}
                        className="text-sky-300 underline-offset-2 hover:underline"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
