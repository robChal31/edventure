import { createId, nowIso } from "../ids";
import { seedStaff } from "../seed";
import { createLocalCollection } from "../storage/local-collection";
import type { StaffRole, StaffUser } from "../types";

const ROLES: StaffRole[] = ["super_admin", "school_admin", "teacher"];

function sanitizeStaff(raw: unknown): StaffUser | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        typeof value.username !== "string" ||
        typeof value.password !== "string" ||
        !ROLES.includes(value.role as StaffRole)
    ) {
        return null;
    }
    return {
        id: value.id,
        role: value.role as StaffRole,
        name: value.name,
        username: normalizeUsername(value.username),
        password: value.password,
        schoolId: typeof value.schoolId === "string" ? value.schoolId : null,
        classIds: Array.isArray(value.classIds)
            ? value.classIds.filter((c): c is string => typeof c === "string")
            : [],
        createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
    };
}

export const staffStore = createLocalCollection<StaffUser>({
    key: "learning-world.lms.staff.v1",
    sanitize: sanitizeStaff,
    seed: seedStaff,
});

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase().replace(/\s+/g, ".");
}

/** Finds the account for a username + password pair, or null. */
export function authenticateStaff(username: string, password: string): StaffUser | null {
    const name = normalizeUsername(username);
    return (
        staffStore.getSnapshot().find(
            (user) => user.username === name && user.password === password
        ) ?? null
    );
}

export type StaffDraft = {
    id?: string;
    role: StaffRole;
    name: string;
    username: string;
    password: string;
    schoolId: string | null;
    classIds: string[];
};

export function validateStaffDraft(draft: StaffDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) errors.push("Enter the person's name.");
    const username = normalizeUsername(draft.username);
    if (username.length < 3) {
        errors.push("Usernames need at least 3 characters.");
    } else if (
        staffStore
            .getSnapshot()
            .some((user) => user.username === username && user.id !== draft.id)
    ) {
        errors.push("Another account already uses that username.");
    }
    if (draft.password.length < 6) errors.push("Passwords need at least 6 characters.");
    if (draft.role !== "super_admin" && !draft.schoolId) {
        errors.push("School admins and teachers belong to a school.");
    }
    return errors;
}

export function saveStaff(draft: StaffDraft): StaffUser {
    const existing = draft.id ? staffStore.get(draft.id) : undefined;
    return staffStore.upsert({
        id: draft.id ?? createId("staff"),
        role: draft.role,
        name: draft.name.trim(),
        username: normalizeUsername(draft.username),
        password: draft.password,
        schoolId: draft.role === "super_admin" ? null : draft.schoolId,
        classIds: draft.role === "teacher" ? draft.classIds : [],
        createdAt: existing?.createdAt ?? nowIso(),
    });
}

export function deleteStaff(id: string): void {
    staffStore.remove(id);
}
