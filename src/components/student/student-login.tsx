"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHydrated, useLmsReady, useSignedInStudent, useStudents } from "@/lms/hooks";
import { findStudentByCode } from "@/lms/repositories/student-repository";
import { signInStudent, signOutStudent } from "@/lms/session/student-session";

export default function StudentLogin() {
    const router = useRouter();
    // Wait for the one-time data upgrade before reading any LMS data.
    const mounted = useHydrated();
    const lmsReady = useLmsReady();
    const hydrated = mounted && lmsReady;
    const students = useStudents();
    const signedIn = useSignedInStudent();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);

    const demo = students.find((student) => student.id.startsWith("student-demo"));

    const submit = () => {
        const student = findStudentByCode(code);
        if (!student) {
            setError("Hmm, that code doesn't match anyone. Check with your teacher!");
            return;
        }
        signInStudent(student.id);
        router.push("/student/play");
    };

    return (
        <div className="flex min-h-full flex-1 items-center justify-center bg-linear-to-b from-sky-900 via-slate-900 to-slate-950 px-4 py-10">
            <div className="lw-pop-in pixel-panel w-full max-w-md rounded-2xl border-4 border-sky-900 bg-slate-900/95 p-6 sm:p-8">
                <div className="text-center">
                    <div className="lw-bob text-5xl" aria-hidden>🧭</div>
                    <h1 className="mt-3 font-pixel text-lg text-amber-300">STUDENT LOGIN</h1>
                    <p className="mt-2 text-sm text-sky-200">Type the secret code your teacher gave you.</p>
                </div>

                {hydrated && signedIn && (
                    <div className="mt-6 rounded-xl border-2 border-emerald-700 bg-emerald-950/40 p-4 text-center">
                        <p className="text-sm text-emerald-100">
                            Welcome back, <strong>{signedIn.avatar} {signedIn.name}</strong>!
                        </p>
                        <div className="mt-3 flex justify-center gap-2">
                            <Link
                                href="/student/play"
                                className="pixel-btn rounded-lg bg-emerald-500 px-4 py-2.5 font-pixel text-[10px] text-emerald-950"
                            >
                                ▶ CONTINUE
                            </Link>
                            <button
                                type="button"
                                onClick={() => signOutStudent()}
                                className="pixel-btn rounded-lg bg-slate-600 px-4 py-2.5 font-pixel text-[10px] text-slate-50"
                            >
                                NOT ME
                            </button>
                        </div>
                    </div>
                )}

                <form
                    className="mt-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <label htmlFor="student-code" className="font-pixel text-[10px] text-slate-400">
                        MY CODE
                    </label>
                    <input
                        id="student-code"
                        value={code}
                        onChange={(event) => {
                            setCode(event.target.value.toUpperCase());
                            setError(null);
                        }}
                        placeholder="e.g. ORCA47"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={16}
                        className="mt-2 w-full rounded-xl border-4 border-amber-700 bg-amber-50 px-4 py-3 text-center font-pixel text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                    />
                    {error && <p className="mt-2 text-center text-sm text-rose-300">{error}</p>}

                    <button
                        type="submit"
                        disabled={!code.trim()}
                        className="pixel-btn mt-4 w-full rounded-xl bg-amber-400 px-6 py-4 font-pixel text-sm text-amber-950 disabled:opacity-50"
                    >
                        ▶ LET&apos;S GO!
                    </button>
                </form>

                {hydrated && demo && (
                    <p className="mt-4 text-center text-xs text-slate-500">
                        Demo class: try <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">{demo.code}</code>
                    </p>
                )}

                <div className="mt-6 text-center">
                    <Link href="/" className="text-xs text-sky-300 hover:underline">
                        ← Back
                    </Link>
                </div>
            </div>
        </div>
    );
}
