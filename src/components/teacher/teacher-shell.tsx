"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
    { href: "/teacher", label: "Dashboard", icon: "🏠" },
    { href: "/teacher/questions", label: "Questions", icon: "❓" },
    { href: "/teacher/quizzes", label: "Quizzes", icon: "📜" },
    { href: "/teacher/students", label: "Students", icon: "🧒" },
    { href: "/teacher/reports", label: "Reports", icon: "📊" },
];

function isActive(pathname: string, href: string): boolean {
    return href === "/teacher" ? pathname === href : pathname.startsWith(href);
}

export default function TeacherShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-dvh flex-1 flex-col bg-slate-950 text-slate-100 lg:flex-row">
            <aside className="border-b-4 border-slate-900 bg-slate-900/80 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r-4">
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden>🎣</span>
                        <span className="font-pixel text-[10px] leading-relaxed text-amber-300">
                            LEARNING
                            <br />
                            WORLD
                        </span>
                    </Link>
                    <span className="rounded bg-emerald-500/15 px-2 py-1 font-pixel text-[8px] text-emerald-300 ring-1 ring-emerald-500/40">
                        TEACHER
                    </span>
                </div>

                <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3">
                    {NAV.map((item) => {
                        const active = isActive(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                                    active
                                        ? "bg-amber-400 text-amber-950 shadow-[0_3px_0_#0b1020]"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <span aria-hidden>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden px-4 pt-4 lg:block">
                    <div className="rounded-lg border-2 border-slate-800 p-3 text-xs text-slate-400">
                        Students play at{" "}
                        <Link href="/student" className="font-semibold text-sky-300 hover:underline">
                            /student
                        </Link>{" "}
                        with the login codes from the Students page.
                    </div>
                </div>
            </aside>

            <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        </div>
    );
}
