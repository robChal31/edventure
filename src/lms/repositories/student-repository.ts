import { createId, nowIso } from "../ids";
import { seedStudents } from "../seed";
import { createLocalCollection } from "../storage/local-collection";
import type { Student } from "../types";
import { deleteAttemptsForStudent } from "./attempt-repository";
import { classStore } from "./organisation-repository";
import { removeStudentFromAssignments } from "./quiz-repository";

export const STUDENT_AVATARS = [
    "🦊", "🐼", "🐯", "🐨", "🦉", "🐸", "🐧", "🦁", "🐵", "🐰", "🐻", "🦄",
    "🐶", "🐱", "🐹", "🦋", "🐝", "🐞", "🌟", "🚀", "🎈", "🌈", "🍀", "⭐",
] as const;

const CODE_WORDS = [
    "LUNA", "NOVA", "MAPLE", "RIVER", "CEDAR", "COMET", "ROBIN", "TIGER",
    "PANDA", "KOALA", "MANGO", "BERRY", "ORBIT", "PIXEL", "SUNNY", "FOREST",
];

function sanitizeStudent(raw: unknown): Student | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;

    if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        typeof value.code !== "string"
    ) {
        return null;
    }

    return {
        id: value.id,
        name: value.name,
        schoolId: typeof value.schoolId === "string" ? value.schoolId : null,
        classId: typeof value.classId === "string" ? value.classId : null,
        className: typeof value.className === "string" ? value.className : "",
        code: normalizeCode(value.code),
        avatar: typeof value.avatar === "string" ? value.avatar : STUDENT_AVATARS[0],
        createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
    };
}

export const studentStore = createLocalCollection<Student>({
    key: "learning-world.lms.students.v1",
    sanitize: sanitizeStudent,
    seed: seedStudents,
});

export function normalizeCode(code: string): string {
    return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** A memorable, unique code such as "ORCA47". */
export function generateStudentCode(taken: ReadonlySet<string>): string {
    for (let i = 0; i < 200; i++) {
        const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
        const digits = String(Math.floor(Math.random() * 90) + 10);
        const code = `${word}${digits}`;
        if (!taken.has(code)) return code;
    }
    // Practically unreachable; fall back to something long and random.
    return `CODE${Date.now().toString(36).toUpperCase()}`;
}

function takenCodes(exceptId?: string): Set<string> {
    return new Set(
        studentStore
            .getSnapshot()
            .filter((student) => student.id !== exceptId)
            .map((student) => student.code)
    );
}

export type StudentDraft = {
    id?: string;
    name: string;
    schoolId: string | null;
    classId: string | null;
    avatar: string;
    code: string;
    createdAt?: string;
};

export function emptyStudentDraft(schoolId: string | null = null, classId: string | null = null): StudentDraft {
    return {
        name: "",
        schoolId,
        classId,
        avatar: STUDENT_AVATARS[Math.floor(Math.random() * STUDENT_AVATARS.length)],
        code: generateStudentCode(takenCodes()),
    };
}

export function validateStudentDraft(draft: StudentDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) {
        errors.push("Enter the student's name.");
    }
    const code = normalizeCode(draft.code);
    if (!draft.schoolId) {
        errors.push("Choose the school for this student.");
    }
    if (code.length < 4) {
        errors.push("Login codes need at least 4 letters or numbers.");
    } else if (takenCodes(draft.id).has(code)) {
        errors.push("Another student already uses that login code.");
    }
    return errors;
}

/** The display name of a class id ("" when unassigned). */
export function classNameOf(classId: string | null): string {
    if (!classId) return "";
    return classStore.get(classId)?.name ?? "";
}

export function saveStudent(draft: StudentDraft): Student {
    return studentStore.upsert({
        id: draft.id ?? createId("student"),
        name: draft.name.trim(),
        schoolId: draft.schoolId,
        classId: draft.classId,
        className: classNameOf(draft.classId),
        avatar: draft.avatar,
        code: normalizeCode(draft.code),
        createdAt: draft.createdAt ?? nowIso(),
    });
}

/** Adds many students at once (one name per line in the teacher UI). */
export function addStudents(
    names: readonly string[],
    target: { schoolId: string | null; classId: string | null }
): Student[] {
    const taken = takenCodes();
    const created = names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => {
            const code = generateStudentCode(taken);
            taken.add(code);
            return {
                id: createId("student"),
                name,
                schoolId: target.schoolId,
                classId: target.classId,
                className: classNameOf(target.classId),
                avatar: STUDENT_AVATARS[index % STUDENT_AVATARS.length],
                code,
                createdAt: nowIso(),
            } satisfies Student;
        });

    studentStore.upsertMany(created);
    return created;
}

export function regenerateStudentCode(id: string): void {
    studentStore.update(id, (student) => ({
        ...student,
        code: generateStudentCode(takenCodes(id)),
    }));
}

/** Removes the student, their attempts and their quiz assignments. */
export function deleteStudent(id: string): void {
    studentStore.remove(id);
    deleteAttemptsForStudent(id);
    removeStudentFromAssignments(id);
}

export function findStudentByCode(code: string): Student | undefined {
    const normalized = normalizeCode(code);
    if (!normalized) return undefined;
    return studentStore.getSnapshot().find((student) => student.code === normalized);
}
