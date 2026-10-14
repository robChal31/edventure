"use client";

import { useSyncExternalStore } from "react";
import type { Question } from "@/quiz/types";
import { ensureLmsMigrated } from "./migrations";
import { attemptStore } from "./repositories/attempt-repository";
import { classStore, schoolStore } from "./repositories/organisation-repository";
import { questionStore } from "./repositories/question-repository";
import { quizStore } from "./repositories/quiz-repository";
import { staffStore } from "./repositories/staff-repository";
import { studentStore } from "./repositories/student-repository";
import {
    getServerSignedInStaffId,
    getSignedInStaffId,
    subscribeStaffSession,
} from "./session/staff-session";
import {
    getServerSignedInStudentId,
    getSignedInStudentId,
    subscribeStudentSession,
} from "./session/student-session";
import type { LocalCollection, Entity } from "./storage/local-collection";
import type { Quiz, QuizAttempt, School, SchoolClass, StaffUser, Student } from "./types";

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

export function useSchools(): readonly School[] {
    return useCollection(schoolStore);
}

export function useClasses(): readonly SchoolClass[] {
    return useCollection(classStore);
}

export function useStaff(): readonly StaffUser[] {
    return useCollection(staffStore);
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

/** The signed-in staff account, or null (also null while loading). */
export function useSignedInStaff(): StaffUser | null {
    const id = useSyncExternalStore(
        subscribeStaffSession,
        getSignedInStaffId,
        getServerSignedInStaffId
    );
    const staff = useStaff();
    return id ? (staff.find((user) => user.id === id) ?? null) : null;
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

/**
 * True once the browser has been upgraded to the current LMS data layout.
 * Gate every LMS screen on it so migrations run before any data is read.
 */
export function useLmsReady(): boolean {
    return useSyncExternalStore(
        noopSubscribe,
        () => ensureLmsMigrated(),
        () => false
    );
}
