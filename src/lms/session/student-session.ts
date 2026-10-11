/**
 * Which student is signed in on this browser tab.
 *
 * Uses sessionStorage (not localStorage) on purpose: classroom devices are
 * shared, so closing the tab signs the student out.
 */

const SESSION_KEY = "learning-world.student-session.v1";

const listeners = new Set<() => void>();
let cached: string | null | undefined;

function read(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.sessionStorage.getItem(SESSION_KEY);
    } catch {
        return null;
    }
}

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function getSignedInStudentId(): string | null {
    if (cached === undefined) cached = read();
    return cached;
}

export function getServerSignedInStudentId(): string | null {
    return null;
}

export function subscribeStudentSession(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function signInStudent(studentId: string): void {
    cached = studentId;
    try {
        window.sessionStorage.setItem(SESSION_KEY, studentId);
    } catch {
        // ignore — stays signed in for this page view
    }
    emit();
}

export function signOutStudent(): void {
    cached = null;
    try {
        window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
        // ignore
    }
    emit();
}
