import { createId, nowIso } from "../ids";
import { seedClasses, seedSchools } from "../seed";
import { createLocalCollection } from "../storage/local-collection";
import type { School, SchoolClass } from "../types";
import { studentStore } from "./student-repository";
import { questionStore } from "./question-repository";
import { quizStore, removeClassFromAssignments } from "./quiz-repository";
import { staffStore } from "./staff-repository";

function str(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function sanitizeSchool(raw: unknown): School | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.name !== "string") return null;
    return {
        id: value.id,
        name: value.name,
        code: str(value.code, value.id.slice(-5).toUpperCase()),
        createdAt: str(value.createdAt, nowIso()),
    };
}

function sanitizeClass(raw: unknown): SchoolClass | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.name !== "string") return null;
    if (typeof value.schoolId !== "string") return null;
    return {
        id: value.id,
        schoolId: value.schoolId,
        name: value.name,
        grade: typeof value.grade === "number" ? value.grade : 1,
        createdAt: str(value.createdAt, nowIso()),
    };
}

export const schoolStore = createLocalCollection<School>({
    key: "learning-world.lms.schools.v1",
    sanitize: sanitizeSchool,
    seed: seedSchools,
});

export const classStore = createLocalCollection<SchoolClass>({
    key: "learning-world.lms.classes.v1",
    sanitize: sanitizeClass,
    seed: seedClasses,
});

export function schoolName(schoolId: string | null | undefined): string {
    if (!schoolId) return "Global";
    return schoolStore.get(schoolId)?.name ?? "Unknown school";
}

export function classesOfSchool(schoolId: string | null): SchoolClass[] {
    return classStore
        .getSnapshot()
        .filter((klass) => klass.schoolId === schoolId)
        .slice()
        .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
}

export type SchoolDraft = { id?: string; name: string; code: string };

export function validateSchoolDraft(draft: SchoolDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) errors.push("Give the school a name.");
    if (!draft.code.trim()) errors.push("Give the school a short code.");
    return errors;
}

export function saveSchool(draft: SchoolDraft): School {
    const existing = draft.id ? schoolStore.get(draft.id) : undefined;
    return schoolStore.upsert({
        id: draft.id ?? createId("school"),
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        createdAt: existing?.createdAt ?? nowIso(),
    });
}

/** Deleting a school also removes its classes, staff, students and content. */
export function deleteSchool(id: string): void {
    classStore.removeWhere((klass) => klass.schoolId === id);
    staffStore.removeWhere((user) => user.schoolId === id);
    studentStore.removeWhere((student) => student.schoolId === id);
    questionStore.removeWhere((question) => question.schoolId === id);
    quizStore.removeWhere((quiz) => quiz.schoolId === id);
    schoolStore.remove(id);
}

export type ClassDraft = { id?: string; schoolId: string; name: string; grade: number };

export function validateClassDraft(draft: ClassDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) errors.push("Give the class a name, e.g. 4A.");
    if (!draft.schoolId) errors.push("Choose the school for this class.");
    if (!draft.grade) errors.push("Choose the grade of this class.");
    const duplicate = classStore
        .getSnapshot()
        .some(
            (klass) =>
                klass.id !== draft.id &&
                klass.schoolId === draft.schoolId &&
                klass.name.toLowerCase() === draft.name.trim().toLowerCase()
        );
    if (duplicate) errors.push("This school already has a class with that name.");
    return errors;
}

export function saveClass(draft: ClassDraft): SchoolClass {
    const existing = draft.id ? classStore.get(draft.id) : undefined;
    const saved = classStore.upsert({
        id: draft.id ?? createId("class"),
        schoolId: draft.schoolId,
        name: draft.name.trim(),
        grade: draft.grade,
        createdAt: existing?.createdAt ?? nowIso(),
    });
    // Keep the students' display class name in sync.
    studentStore.mapAll((student) =>
        student.classId === saved.id && student.className !== saved.name
            ? { ...student, className: saved.name }
            : student
    );
    return saved;
}

/** Deleting a class unassigns its students and removes it from quizzes and teachers. */
export function deleteClass(id: string): void {
    studentStore.mapAll((student) =>
        student.classId === id ? { ...student, classId: null, className: "" } : student
    );
    staffStore.mapAll((user) =>
        user.classIds.includes(id)
            ? { ...user, classIds: user.classIds.filter((c) => c !== id) }
            : user
    );
    removeClassFromAssignments(id);
    classStore.remove(id);
}
