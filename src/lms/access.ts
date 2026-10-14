import type { Question } from "@/quiz/types";
import type { Quiz, QuizAssignment, Role, SchoolClass, Student, StaffUser } from "./types";

/**
 * Who may see and change what. Pure functions over the signed-in user, so
 * the screens and the repositories always agree on the same rules.
 *
 *                      developer   school admin    teacher
 * schools              all         —               —
 * classes              all         own school      own classes (read)
 * staff accounts       all         own teachers    —
 * students             all         own school      own classes (read)
 * global bank/quizzes  edit        read + copy     read + copy
 * school questions     all         own school      own school
 * school quizzes       all         own school      own school
 * reports              all         own school      own classes
 */

type Actor = Pick<StaffUser, "role" | "schoolId" | "classIds"> | null;

export function roleOf(actor: Actor): Role | null {
    return actor?.role ?? null;
}

export function isSuperAdmin(actor: Actor): boolean {
    return actor?.role === "super_admin";
}

export function canManageSchools(actor: Actor): boolean {
    return isSuperAdmin(actor);
}

export function canManageStaff(actor: Actor): boolean {
    return actor?.role === "super_admin" || actor?.role === "school_admin";
}

/** Only school admins and the developer change classes and students. */
export function canManageRoster(actor: Actor): boolean {
    return canManageStaff(actor);
}

/** Can the actor create or edit this staff account? */
export function canEditStaff(actor: Actor, target: StaffUser): boolean {
    if (!actor) return false;
    if (actor.role === "super_admin") return true;
    if (actor.role === "school_admin") {
        return target.role === "teacher" && target.schoolId === actor.schoolId;
    }
    return false;
}

export function visibleClasses(actor: Actor, classes: readonly SchoolClass[]): SchoolClass[] {
    if (!actor) return [];
    if (actor.role === "super_admin") return classes.slice();
    if (actor.role === "school_admin") {
        return classes.filter((klass) => klass.schoolId === actor.schoolId);
    }
    if (actor.role === "teacher") {
        return classes.filter((klass) => actor.classIds.includes(klass.id));
    }
    return [];
}

export function visibleStudents(actor: Actor, students: readonly Student[]): Student[] {
    if (!actor) return [];
    if (actor.role === "super_admin") return students.slice();
    if (actor.role === "school_admin") {
        return students.filter((student) => student.schoolId === actor.schoolId);
    }
    if (actor.role === "teacher") {
        return students.filter(
            (student) => student.classId !== null && actor.classIds.includes(student.classId)
        );
    }
    return [];
}

/** Owned by this actor's school, or by the global bank. */
function inScope(actor: Actor, owner: string | null | undefined): boolean {
    if (!actor) return false;
    if (actor.role === "super_admin") return true;
    return owner === null || owner === actor.schoolId;
}

export function visibleQuestions(actor: Actor, questions: readonly Question[]): Question[] {
    return questions.filter((question) => inScope(actor, question.schoolId));
}

export function visibleQuizzes(actor: Actor, quizzes: readonly Quiz[]): Quiz[] {
    return quizzes.filter((quiz) => inScope(actor, quiz.schoolId));
}

/** Global content is read-only for everyone but the developer. */
export function canEditOwned(actor: Actor, owner: string | null | undefined): boolean {
    if (!actor) return false;
    if (actor.role === "super_admin") return true;
    return owner !== null && owner === actor.schoolId;
}

/** Only staff who may write questions/quizzes for their school. */
export function canAuthorContent(actor: Actor): boolean {
    return actor?.role === "super_admin" || actor?.role === "school_admin" || actor?.role === "teacher";
}

/** The school a new question or quiz is created for (null = global bank). */
export function authoringSchoolId(actor: Actor): string | null {
    if (actor?.role === "super_admin") return null;
    return actor?.schoolId ?? null;
}

/** Students a quiz owned by `schoolId` can be assigned to. */
export function studentsInScope(
    schoolId: string | null | undefined,
    students: readonly Student[]
): Student[] {
    if (schoolId === undefined || schoolId === null) return students.slice();
    return students.filter((student) => student.schoolId === schoolId);
}

/** Does this quiz reach this student? (scope, then assignment) */
export function isQuizAssignedTo(
    quiz: Pick<Quiz, "assignment" | "schoolId">,
    student: Pick<Student, "id" | "classId" | "schoolId">
): boolean {
    if (quiz.schoolId && student.schoolId !== quiz.schoolId) return false;
    return isAssignmentMatch(quiz.assignment, student);
}

function isAssignmentMatch(
    assignment: QuizAssignment,
    student: Pick<Student, "id" | "classId">
): boolean {
    switch (assignment.mode) {
        case "everyone":
            return true;
        case "classes":
            return student.classId !== null && assignment.classIds.includes(student.classId);
        case "students":
            return assignment.studentIds.includes(student.id);
    }
}

export function assignmentLabel(
    assignment: QuizAssignment,
    classes: readonly SchoolClass[],
    students: readonly Student[]
): string {
    switch (assignment.mode) {
        case "everyone":
            return "Everyone in scope";
        case "classes": {
            const names = assignment.classIds
                .map((id) => classes.find((c) => c.id === id)?.name)
                .filter(Boolean);
            return names.length ? `Classes ${names.join(", ")}` : "No classes";
        }
        case "students": {
            const count = assignment.studentIds.filter((id) =>
                students.some((s) => s.id === id)
            ).length;
            return `${count} student${count === 1 ? "" : "s"}`;
        }
    }
}
