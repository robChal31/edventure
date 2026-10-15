/**
 * Which staff account (developer, school admin or teacher) is signed in on
 * this browser tab. Like the student session, it lives in sessionStorage so
 * closing the tab signs out.
 */

const SESSION_KEY = "learning-world.staff-session.v1";

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

export function getSignedInStaffId(): string | null {
    if (cached === undefined) cached = read();
    return cached;
}

export function getServerSignedInStaffId(): string | null {
    return null;
}

export function subscribeStaffSession(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function signInStaff(staffId: string): void {
    cached = staffId;
    try {
        window.sessionStorage.setItem(SESSION_KEY, staffId);
    } catch {
        // ignore — stays signed in for this page view
    }
    emit();
}

export function signOutStaff(): void {
    cached = null;
    try {
        window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
        // ignore
    }
    emit();
}
