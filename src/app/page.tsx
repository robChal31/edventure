"use client";

import { useState } from "react";
import HomeScreen from "@/components/home-screen";
import QuizCreator from "@/components/teacher/quiz-creator";
import GameScreen from "@/components/student/game-screen";
import type { Quiz } from "@/quiz/types";
import { setActiveRoom } from "@/quiz/quiz-storage";

type View =
    | { kind: "home" }
    | { kind: "create" }
    | { kind: "play"; quiz: Quiz; nonce: number };

export default function Home() {
    const [view, setView] = useState<View>({ kind: "home" });

    return (
        <main className="flex h-dvh w-full flex-col overflow-hidden">
            {view.kind === "home" && (
                <HomeScreen
                    onCreate={() => setView({ kind: "create" })}
                    onPlay={(quiz) => {
                        setActiveRoom(quiz.id);
                        setView({ kind: "play", quiz, nonce: Date.now() });
                    }}
                />
            )}

            {view.kind === "create" && (
                <QuizCreator
                    onBack={() => setView({ kind: "home" })}
                    onPlay={(quiz) => {
                        setActiveRoom(quiz.id);
                        setView({ kind: "play", quiz, nonce: Date.now() });
                    }}
                />
            )}

            {view.kind === "play" && (
                <GameScreen
                    key={`${view.quiz.id}-${view.nonce}`}
                    quiz={view.quiz}
                    onMenu={() => setView({ kind: "home" })}
                />
            )}
        </main>
    );
}
