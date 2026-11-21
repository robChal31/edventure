"use client";

import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useQuestions, useQuizzes, useSignedInStaff } from "@/lms/hooks";
import { toPlayableQuiz } from "@/lms/services/playable-quiz";
import GameScreen from "@/components/student/game-screen";
import WorldLoading from "@/components/ui/world-loading";
import { pixelButtonClass } from "@/components/ui/pixel-button";

/** Play a quiz exactly like a student would — nothing is recorded. */
export default function TeacherPreview({ quizId }: { quizId: string }) {
    const { t } = useI18n();
    const router = useRouter();
    const hydrated = useHydrated();
    const staff = useSignedInStaff();
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
        return <WorldLoading />;
    }

    if (!playable || playable.questions.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
                <p className="font-pixel text-xs text-amber-300">{t("NOTHING TO PREVIEW")}</p>
                <p className="text-sm text-slate-400">{t("This quiz doesn't exist or has no questions yet.")}</p>
                <Link href="/teacher/quizzes" className={pixelButtonClass("sky")}>{t("← Back to quizzes")}</Link>
            </div>
        );
    }

    return (
        <GameScreen
            playerName={staff?.name ?? "Preview"}
            initialQuiz={playable}
            ribbon={t("TEACHER PREVIEW · RESULTS ARE NOT SAVED")}
            exit={{ label: "✕ EXIT PREVIEW", onExit: () => router.push("/teacher/quizzes") }}
        />
    );
}
