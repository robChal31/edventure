import type { ActivityId, AnswerRecord, Classification } from "@/quiz/types";

/**
 * Teacher-side (LMS) entities. Questions live in `src/quiz/types.ts`
 * because the game consumes them too; everything that is only about
 * running a school lives here.
 */

// ─────────────────────────────────────────
// ROLES & ORGANISATION
// ─────────────────────────────────────────

/**
 * - super_admin: developer. Creates schools, classes and every user; owns
 *   the global question bank and premade quizzes.
 * - school_admin: runs one school. Manages its teachers, students, classes,
 *   and its own questions and quizzes.
 * - teacher: sees and assigns quizzes to the students of their own classes.
 * - student: plays quests on the game (signs in with a login code).
 */
export type Role = "super_admin" | "school_admin" | "teacher" | "student";

/** Roles that sign in with username + password to the LMS. */
export type StaffRole = Exclude<Role, "student">;

export const ROLE_LABELS: Record<Role, string> = {
    super_admin: "Developer (super admin)",
    school_admin: "School admin",
    teacher: "Teacher",
    student: "Student",
};

export type School = {
    id: string;
    name: string;
    /** Short code shown on reports and used as a prefix, e.g. "HBG01". */
    code: string;
    createdAt: string;
};

export type SchoolClass = {
    id: string;
    schoolId: string;
    /** Display name, e.g. "4A". */
    name: string;
    grade: number;
    createdAt: string;
};

/** Staff account (LMS login). */
export type StaffUser = {
    id: string;
    role: StaffRole;
    name: string;
    /** Login name (lowercase, no spaces). */
    username: string;
    /** Prototype only: stored as-is in the browser. See README. */
    password: string;
    /** Null for super admins (they see every school). */
    schoolId: string | null;
    /** Teachers: the classes they teach. */
    classIds: string[];
    createdAt: string;
};

// ─────────────────────────────────────────
// STUDENTS & QUIZZES
// ─────────────────────────────────────────

export type Student = {
    id: string;
    name: string;
    schoolId: string | null;
    /** The class the student belongs to. */
    classId: string | null;
    /** Mirrors the class name for display and CSV ("4A"); derived from classId. */
    className: string;
    /** Login code the student types to sign in (unique, uppercase). */
    code: string;
    /** Emoji avatar shown in the game HUD and teacher lists. */
    avatar: string;
    createdAt: string;
};

export type QuizAssignment =
    | { mode: "everyone" }
    | { mode: "classes"; classIds: string[] }
    | { mode: "students"; studentIds: string[] };

export type Quiz = Classification & {
    id: string;
    name: string;
    description: string;
    /** The activity (game map) the quiz is played in. */
    activityId: ActivityId;
    /** Ordered references into the question bank. */
    questionIds: string[];
    shuffleQuestions: boolean;
    /** Owner: null = global premade quiz, otherwise the school's quiz. */
    schoolId?: string | null;
    /** Draft quizzes are hidden from students. */
    published: boolean;
    assignment: QuizAssignment;
    createdAt: string;
    updatedAt: string;
};

/** One completed play-through of a quiz by a student. */
export type QuizAttempt = {
    id: string;
    quizId: string;
    /** Snapshot so reports survive renames/deletes. */
    quizName: string;
    studentId: string;
    studentName: string;
    /** Snapshot of the student's class at the time of the attempt. */
    className?: string;
    activityId: ActivityId;
    startedAt: string;
    completedAt: string;
    total: number;
    correct: number;
    /** 0–100, rounded. */
    score: number;
    records: AnswerRecord[];
};
