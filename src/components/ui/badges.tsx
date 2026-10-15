import { QUESTION_TYPES } from "@/quiz/question-types";
import type { QuestionType } from "@/quiz/types";

const TYPE_STYLES: Record<QuestionType, string> = {
    multiple_choice: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
    true_false: "bg-violet-500/15 text-violet-300 ring-violet-500/40",
    short_answer: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
};

export function QuestionTypeBadge({ type, compact = false }: { type: QuestionType; compact?: boolean }) {
    const info = QUESTION_TYPES[type];
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${TYPE_STYLES[type]}`}
            title={info.description}
        >
            <span aria-hidden>{info.icon}</span>
            {compact ? info.shortLabel : info.label}
        </span>
    );
}

export function scoreTone(score: number | null): string {
    if (score === null) return "bg-slate-700/60 text-slate-300 ring-slate-600";
    if (score >= 80) return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40";
    if (score >= 50) return "bg-amber-500/15 text-amber-300 ring-amber-500/40";
    return "bg-rose-500/15 text-rose-300 ring-rose-500/40";
}

export function ScorePill({ score, label }: { score: number | null; label?: string }) {
    return (
        <span
            className={`inline-flex min-w-12 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ${scoreTone(score)}`}
        >
            {score === null ? "—" : `${score}%`}
            {label && <span className="ml-1 font-normal opacity-80">{label}</span>}
        </span>
    );
}

export function StatusPill({ published }: { published: boolean }) {
    return published ? (
        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
            ● Published
        </span>
    ) : (
        <span className="rounded-md bg-slate-700/60 px-2 py-0.5 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-600">
            ○ Draft
        </span>
    );
}

export function SubjectTag({ subject }: { subject?: string }) {
    if (!subject) return null;
    return (
        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-700">
            {subject}
        </span>
    );
}

/** Small label chips for question/quiz classification. */
export function ChipTag({
    children,
    tone = "slate",
    title,
}: {
    children: React.ReactNode;
    tone?: "slate" | "sky" | "emerald" | "amber" | "violet" | "rose";
    title?: string;
}) {
    const tones = {
        slate: "bg-slate-800 text-slate-300 ring-slate-700",
        sky: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
        emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
        amber: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
        violet: "bg-violet-500/15 text-violet-300 ring-violet-500/40",
        rose: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    };
    return (
        <span
            title={title}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone]}`}
        >
            {children}
        </span>
    );
}
