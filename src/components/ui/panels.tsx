import type { ReactNode } from "react";

export function StatCard({
    icon,
    label,
    value,
    hint,
    tone = "sky",
}: {
    icon: string;
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    tone?: "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
    const tones = {
        sky: "from-sky-500/20 text-sky-300",
        emerald: "from-emerald-500/20 text-emerald-300",
        amber: "from-amber-500/20 text-amber-300",
        violet: "from-violet-500/20 text-violet-300",
        rose: "from-rose-500/20 text-rose-300",
    };

    return (
        <div className={`pixel-panel rounded-xl bg-linear-to-br ${tones[tone]} to-slate-900 p-4`}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                </span>
                <span className="text-xl" aria-hidden>
                    {icon}
                </span>
            </div>
            <div className="mt-2 font-pixel text-xl">{value}</div>
            {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    children,
    action,
}: {
    icon: string;
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-700 px-6 py-10 text-center">
            <div className="lw-bob text-4xl" aria-hidden>
                {icon}
            </div>
            <h3 className="mt-3 font-pixel text-xs text-amber-300">{title}</h3>
            {children && <p className="mt-2 max-w-md text-sm text-slate-400">{children}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="font-pixel text-base text-amber-300 sm:text-lg">{title}</h1>
                {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/70" />
            ))}
        </div>
    );
}

export function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: ReactNode;
    children: ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </span>
            {children}
            {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </label>
    );
}

export const inputClass =
    "w-full rounded-lg border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

export function ErrorList({ errors }: { errors: string[] }) {
    if (errors.length === 0) return null;
    return (
        <ul className="rounded-lg border-2 border-rose-700 bg-rose-950/50 px-4 py-2 text-sm text-rose-200">
            {errors.map((error) => (
                <li key={error}>• {error}</li>
            ))}
        </ul>
    );
}
