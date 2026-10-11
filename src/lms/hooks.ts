"use client";

import { useSyncExternalStore } from "react";
import type { Question } from "@/quiz/types";
import { attemptStore } from "./repositories/attempt-repository";
import { questionStore } from "./repositories/question-repository";
import { quizStore } from "./repositories/quiz-repository";
import { studentStore } from "./repositories/student-repository";
import {
    getServerSignedInStudentId,
    getSignedInStudentId,
    subscribeStudentSession,
} from "./session/student-session";
import type { LocalCollection, Entity } from "./storage/local-collection";
import type { Quiz, QuizAttempt, Student } from "./types";

function useCollection<T extends Entity>(store: LocalCollection<T>): readonly T[] {
    return useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        store.getServerSnapshot
    );
}

export function useQuestions(): readonly Question[] {
    return useCollection(questionStore);
}

export function useQuizzes(): readonly Quiz[] {
    return useCollection(quizStore);
}

export function useStudents(): readonly Student[] {
    return useCollection(studentStore);
}

export function useAttempts(): readonly QuizAttempt[] {
    return useCollection(attemptStore);
}

export function useSignedInStudent(): Student | null {
    const id = useSyncExternalStore(
        subscribeStudentSession,
        getSignedInStudentId,
        getServerSignedInStudentId
    );
    const students = useStudents();
    return id ? (students.find((student) => student.id === id) ?? null) : null;
}

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Lets pages
 * show a skeleton instead of a misleading "nothing here yet" flash while
 * localStorage data is not readable yet.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false
    );
}
