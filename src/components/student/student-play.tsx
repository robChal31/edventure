"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAttempts, useHydrated, useQuestions, useQuizzes, useSignedInStudent } from "@/lms/hooks";
import { recordAttempt } from "@/lms/repositories/attempt-repository";
import { questionStore } from "@/lms/repositories/question-repository";
import { quizStore } from "@/lms/repositories/quiz-repository";
import { progressByQuiz } from "@/lms/services/reports";
import { questsForStudent, resolveQuizQuestions, toPlayableQuiz } from "@/lms/services/playable-quiz";
import { signOutStudent } from "@/lms/session/student-session";
import type { QuestionType, QuizSummary } from "@/quiz/types";
import GameScreen from "./game-screen";
import QuestBoard, { type QuestInfo } from "./hub/quest-board";
import StudentBadge from "./hub/student-badge";

/**
 * Student experience: arrive in the village, pick a quest on the quest
 * board, travel to the beach, fish (= answer questions), come back.
 * Completed attempts are saved for the teacher's reports.
 */
export default function StudentPlay() {
    const router = useRouter();
    const hydrated = useHydrated();
    const student = useSignedInStudent();
    const quizzes = useQuizzes();
    const questions = useQuestions();
    const attempts = useAttempts();

    useEffect(() => {
        if (hydrated && !student) {
            router.replace("/student");
        }
    }, [hydrated, student, router]);

    const quests = useMemo<QuestInfo[]>(() => {
        if (!student) return [];
        const progress = progressByQuiz(attempts.filter((a) => a.studentId === student.id));

        return questsForStudent(student.id, quizzes, questions).map((quiz) => {
            const resolved = resolveQuizQuestions(quiz, questions);
            const types = Array.from(new Set(resolved.map((q) => q.type))) as QuestionType[];
            const mine = progress.get(quiz.id);
            return {
                quizId: quiz.id,
                name: quiz.name,
                description: quiz.description,
                activityId: quiz.activityId,
                questionCount: resolved.length,
                questionTypes: types,
                attempts: mine?.count ?? 0,
                bestScore: mine?.best.score ?? null,
            };
        });
    }, [student, quizzes, questions, attempts]);

    // Read the stores at click time so the latest questions are played.
    const buildQuiz = useCallback((quizId: string) => {
        const quiz = quizStore.get(quizId);
        if (!quiz) return null;
        const playable = toPlayableQuiz(quiz, questionStore.getSnapshot());
        return playable.questions.length > 0 ? playable : null;
    }, []);

    const handleComplete = useCallback(
        (summary: QuizSummary, startedAt: string) => {
            if (!student) return;
            recordAttempt({ student, summary, startedAt });
        },
        [student]
    );

    const signOut = useCallback(() => {
        signOutStudent();
        router.replace("/student");
    }, [router]);

    if (!hydrated || !student) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-950">
                <p className="font-pixel text-[10px] text-sky-300">LOADING…</p>
            </div>
        );
    }

    const pending = quests.some((quest) => quest.attempts === 0);

    return (
        <GameScreen
            badge={<StudentBadge student={student} onSignOut={signOut} />}
            exit={{ label: "SIGN OUT", onExit: signOut }}
            onQuizComplete={handleComplete}
            resultsNote="Saved! Your teacher can see how you did."
            renderHub={(controls) => (
                <QuestBoard
                    controls={controls}
                    quests={quests}
                    buildQuiz={buildQuiz}
                    autoOpen={pending}
                />
            )}
        />
    );
}
