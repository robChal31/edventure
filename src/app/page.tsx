import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-linear-to-b from-sky-900 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
            <div className="lw-bob mb-2 text-5xl" aria-hidden>
                🎣
            </div>
            <h1 className="text-center font-pixel text-2xl text-amber-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-4xl">
                LEARNING WORLD
            </h1>
            <p className="mt-3 max-w-md text-center text-sm text-sky-200">
                Teachers build quizzes. Students explore the village, pick a quest and
                answer questions by fishing at the beach.
            </p>

            <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
                <Link
                    href="/student"
                    className="lw-pop-in pixel-panel group flex flex-col items-center rounded-2xl border-sky-950 bg-sky-500 p-6 text-sky-950 transition hover:-translate-y-1"
                >
                    <span className="text-5xl transition group-hover:scale-110" aria-hidden>
                        🐠
                    </span>
                    <span className="mt-3 font-pixel text-sm">I&apos;M A STUDENT</span>
                    <span className="mt-2 text-center text-sm">
                        Log in with your code and go on fishing quests.
                    </span>
                </Link>

                <Link
                    href="/teacher"
                    className="lw-pop-in pixel-panel group flex flex-col items-center rounded-2xl border-emerald-950 bg-emerald-500 p-6 text-emerald-950 transition hover:-translate-y-1"
                >
                    <span className="text-5xl transition group-hover:scale-110" aria-hidden>
                        🧑‍🏫
                    </span>
                    <span className="mt-3 font-pixel text-sm">I&apos;M A TEACHER</span>
                    <span className="mt-2 text-center text-sm">
                        Manage questions, quizzes, students and reports.
                    </span>
                </Link>
            </div>

            <p className="mt-10 max-w-md text-center text-xs text-slate-500">
                Prototype: all data is stored in this browser (localStorage).
            </p>
        </main>
    );
}
