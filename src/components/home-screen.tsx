"use client";

import { useSyncExternalStore } from "react";
import type { Quiz } from "@/quiz/types";
import {
    deleteRoom,
    getRoomsSnapshot,
    subscribeRooms,
} from "@/quiz/quiz-storage";
import { getActivity } from "@/quiz/activities";

type HomeScreenProps = {
    onCreate: () => void;
    onPlay: (quiz: Quiz) => void;
};

export default function HomeScreen({ onCreate, onPlay }: HomeScreenProps) {
    const rooms = useSyncExternalStore(
        subscribeRooms,
        getRoomsSnapshot,
        () => []
    );

    return (
        <div className="flex-1 overflow-y-auto bg-linear-to-b from-sky-900 via-slate-900 to-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 py-10">
                <div className="mb-2 text-5xl" aria-hidden>
                    🎣
                </div>
                <h1 className="font-pixel text-center text-2xl text-amber-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-4xl">
                    LEARNING WORLD
                </h1>
                <p className="mt-3 max-w-md text-center text-sm text-sky-200">
                    Teachers build quizzes. Students play them as games.
                    First activity: <span className="font-semibold text-amber-300">Fishing</span>.
                </p>

                <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                    <button
                        onClick={onCreate}
                        className="pixel-btn rounded-lg bg-emerald-500 px-6 py-4 font-pixel text-sm text-emerald-950"
                    >
                        🧑🏫 CREATE QUIZ ROOM
                    </button>
                    <a
                        href="#rooms"
                        className="pixel-btn rounded-lg bg-sky-500 px-6 py-4 text-center font-pixel text-sm text-sky-950"
                    >
                        🎮 PLAY A ROOM
                    </a>
                </div>

                <div id="rooms" className="mt-10 w-full">
                    <h2 className="font-pixel mb-3 text-xs text-sky-300">
                        SAVED ROOMS
                    </h2>
                    {rooms.length === 0 ? (
                        <p className="rounded-lg border-2 border-dashed border-slate-700 p-4 text-sm text-slate-400">
                            No rooms yet. Create one to get started!
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {rooms.map((room) => (
                                <li
                                    key={room.id}
                                    className="pixel-panel flex items-center justify-between rounded-lg bg-slate-800/80 px-4 py-3"
                                >
                                    <div>
                                        <div className="font-pixel text-xs text-amber-300">
                                            {room.name}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-400">
                                            {room.questions.length} question
                                            {room.questions.length === 1 ? "" : "s"} ·{" "}
                                            {getActivity(room.activityId).label}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onPlay(room)}
                                            className="pixel-btn rounded bg-emerald-500 px-3 py-2 font-pixel text-[10px] text-emerald-950"
                                        >
                                            PLAY
                                        </button>
                                        <button
                                            onClick={() => deleteRoom(room.id)}
                                            className="pixel-btn rounded bg-rose-600 px-3 py-2 font-pixel text-[10px] text-rose-50"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
