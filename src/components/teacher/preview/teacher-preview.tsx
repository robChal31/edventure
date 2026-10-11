"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useQuestions, useQuizzes } from "@/lms/hooks";
import { toPlayableQuiz } from "@/lms/services/playable-quiz";
import GameScreen from "@/components/student/game-screen";
import { pixelButtonClass } from "@/components/ui/pixel-button";

/** Play a quiz exactly like a student would — nothing is recorded. */
export default function TeacherPreview({ quizId }: { quizId: string }) {
    const router = useRouter();
    const hydrated = useHydrated();
    const quizzes = useQuizzes();
    const questions = useQuestions();

    const quiz = quizzes.find((q) => q.id === quizId);
    const playable = useMemo(
        () => (quiz ? toPlayableQuiz(quiz, questions) : null),
        // Build once per quiz: the game boots with this snapshot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [quiz?.id, hydrated]
    );

    if (!hydrated) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-950">
                <p className="font-pixel text-[10px] text-sky-300">LOADING…</p>
            </div>
        );
    }

    if (!playable || playable.questions.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
                <p className="font-pixel text-xs text-amber-300">NOTHING TO PREVIEW</p>
                <p className="text-sm text-slate-400">This quiz doesn&apos;t exist or has no questions yet.</p>
                <Link href="/teacher/quizzes" className={pixelButtonClass("sky")}>
                    ← Back to quizzes
                </Link>
            </div>
        );
    }

    return (
        <GameScreen
            initialQuiz={playable}
            ribbon="TEACHER PREVIEW · RESULTS ARE NOT SAVED"
            exit={{ label: "✕ EXIT PREVIEW", onExit: () => router.push("/teacher/quizzes") }}
        />
    );
}
