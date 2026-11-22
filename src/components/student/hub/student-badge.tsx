"use client";

import { useI18n } from "@/i18n/provider";
import CharacterPortrait from "@/components/ui/character-portrait";
import type { Student } from "@/lms/types";

export default function StudentBadge({
    student,
    onSignOut,
}: {
    student: Student;
    onSignOut: () => void;
}) {
    const { t } = useI18n();
    return (
        <div className="pixel-panel world-hud-panel flex items-center gap-3 rounded-xl py-2 pl-2 pr-3">
            <CharacterPortrait />
            <div className="min-w-0">
                <div className="truncate font-pixel text-[10px] text-amber-300">{student.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-200">
                    {student.className && <span>{t("Class")}{" "}{student.className}</span>}
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onSignOut}
                        className="text-sky-300 underline-offset-2 hover:underline"
                    >{t("Sign out")}</button>
                </div>
            </div>
        </div>
    );
}
