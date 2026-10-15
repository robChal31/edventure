"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { canManageSchools, canManageStaff, canManageRoster, isSuperAdmin } from "@/lms/access";
import { useSignedInStaff, useSchools } from "@/lms/hooks";
import { signOutStaff } from "@/lms/session/staff-session";
import { ROLE_LABELS, type StaffUser } from "@/lms/types";
import StaffGate from "@/components/staff/staff-gate";
import PixelButton from "@/components/ui/pixel-button";

type NavItem = { href: string; label: string; icon: string; visible: (user: StaffUser) => boolean };

const NAV: NavItem[] = [
    { href: "/teacher", label: "Dashboard", icon: "🏠", visible: () => true },
    { href: "/teacher/schools", label: "Schools", icon: "🏫", visible: (u) => canManageSchools(u) },
    { href: "/teacher/classes", label: "Classes", icon: "🧺", visible: () => true },
    { href: "/teacher/staff", label: "Staff", icon: "🧑‍💼", visible: (u) => canManageStaff(u) },
    { href: "/teacher/questions", label: "Questions", icon: "❓", visible: () => true },
    { href: "/teacher/quizzes", label: "Quizzes", icon: "📜", visible: () => true },
    { href: "/teacher/students", label: "Students", icon: "🧒", visible: () => true },
    { href: "/teacher/reports", label: "Reports", icon: "📊", visible: () => true },
];

function isActive(pathname: string, href: string): boolean {
    return href === "/teacher" ? pathname === href : pathname.startsWith(href);
}

export default function TeacherShell({ children }: { children: ReactNode }) {
    return (
        <StaffGate>
            <Shell>{children}</Shell>
        </StaffGate>
    );
}

function Shell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const staff = useSignedInStaff();
    const schools = useSchools();

    if (!staff) return null;

    const schoolName =
        isSuperAdmin(staff) ? "All schools" : schools.find((s) => s.id === staff.schoolId)?.name ?? "";
    const items = NAV.filter((item) => item.visible(staff));

    return (
        <div className="flex min-h-dvh flex-1 flex-col bg-slate-950 text-slate-100 lg:flex-row">
            <aside className="border-b-4 border-slate-900 bg-slate-900/80 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r-4">
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden>📚</span>
                        <span className="font-pixel text-[10px] leading-relaxed text-amber-300">
                            LEARNING
                            <br />
                            WORLD
                        </span>
                    </Link>
                </div>

                <div className="mx-4 mb-3 rounded-lg bg-slate-800/60 p-3 text-xs">
                    <p className="font-semibold text-slate-100">{staff.name}</p>
                    <p className="mt-0.5 text-slate-400">{ROLE_LABELS[staff.role]}</p>
                    <p className="mt-0.5 truncate text-slate-500">{schoolName}</p>
                </div>

                <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3">
                    {items.map((item) => {
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
                        {canManageRoster(staff) ? (
                            <>Students play at{" "}
                                <Link href="/student" className="font-semibold text-sky-300 hover:underline">
                                    /student
                                </Link>{" "}
                                with their login codes.
                            </>
                        ) : (
                            <>Your students&apos; login codes are managed by your school admin.</>
                        )}
                    </div>
                    <PixelButton
                        tone="slate"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                            signOutStaff();
                            router.replace("/login");
                        }}
                    >
                        ⎋ Sign out
                    </PixelButton>
                </div>
            </aside>

            <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        </div>
    );
}


