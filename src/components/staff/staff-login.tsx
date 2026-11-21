"use client";

import { LanguageSwitcher, useI18n } from "@/i18n/provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lms/hooks";
import { ensureLmsMigrated } from "@/lms/migrations";
import { authenticateStaff } from "@/lms/repositories/staff-repository";
import { signInStaff } from "@/lms/session/staff-session";
import { ROLE_LABELS } from "@/lms/types";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

/** Demo accounts from the seed data, shown so the prototype is easy to try. */
const DEMO_ACCOUNTS = [
    { role: "super_admin", username: "dev", password: "dev12345" },
    { role: "school_admin", username: "admin.harapan", password: "admin123" },
    { role: "teacher", username: "bu.sari", password: "guru123" },
] as const;

export default function StaffLogin() {
    const { t } = useI18n();
    const router = useRouter();
    const hydrated = useHydrated();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<string[]>([]);

    const submit = () => {
        ensureLmsMigrated();
        const user = authenticateStaff(username, password);
        if (!user) {
            setErrors(["Wrong username or password."]);
            return;
        }
        signInStaff(user.id);
        router.replace("/teacher");
    };

    return (
        <main className="staff-theme flex min-h-dvh flex-1 flex-col items-center justify-center bg-linear-to-b from-slate-800 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
            <div className="w-full max-w-md">
                <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-white">{t("← Back")}</Link>
                <h1 className="mt-4 font-pixel text-base text-amber-300">{t("STAFF LOGIN")}</h1>
                <p className="mt-2 text-sm text-slate-400">{t("For developers, school admins and teachers.")}</p>

                <div className="mb-5 flex justify-end"><LanguageSwitcher compact /></div>
                <form
                    className="pixel-panel mt-6 flex flex-col gap-4 rounded-2xl bg-slate-900 p-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <Field label={t("Username")}>
                        <input
                            value={username}
                            onChange={(event) => {
                                setUsername(event.target.value);
                                setErrors([]);
                            }}
                            autoComplete="username"
                            className={inputClass}
                            autoFocus
                        />
                    </Field>
                    <Field label={t("Password")}>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setErrors([]);
                            }}
                            autoComplete="current-password"
                            className={inputClass}
                        />
                    </Field>
                    <ErrorList errors={errors} />
                    <PixelButton tone="emerald" type="submit" disabled={!hydrated}>{t("Sign in")}</PixelButton>
                </form>

                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-700 p-4 text-xs text-slate-400">
                    <p className="font-semibold text-slate-300">{t("Demo accounts")}</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {DEMO_ACCOUNTS.map((account) => (
                            <li key={account.username}>
                                <button
                                    type="button"
                                    className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-800"
                                    onClick={() => {
                                        setUsername(account.username);
                                        setPassword(account.password);
                                        setErrors([]);
                                    }}
                                >
                                    <span className="text-slate-200">{t(ROLE_LABELS[account.role])}</span>
                                    <span className="ml-2 font-mono text-slate-500">
                                        {account.username} / {account.password}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-slate-500">{t("Prototype only: accounts live in this browser. Passwords are not secure.")}</p>
                </div>

                <p className="mt-6 text-center text-xs text-slate-500">{t("Students use the")}{" "}<Link href="/student" className="text-sky-300 hover:underline">{t("student login")}</Link>.
                </p>
            </div>
        </main>
    );
}
