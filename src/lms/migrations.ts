import { SAMPLE_QUESTION_BANK, SAMPLE_QUESTION_IDS } from "@/quiz/question-bank";
import type { Question } from "@/quiz/types";
import { questionStore } from "./repositories/question-repository";
import { quizStore } from "./repositories/quiz-repository";
import { classStore, schoolStore } from "./repositories/organisation-repository";
import { studentStore } from "./repositories/student-repository";
import { seedQuestions, seedQuizzes } from "./seed";
import type { Quiz, SchoolClass } from "./types";

/**
 * Upgrades data written by the previous prototype (one teacher, no schools).
 * Runs once per browser, the first time the LMS is opened after the update:
 *
 * - students without a school join the default school; their old class name
 *   becomes a real class (created if missing)
 * - questions and quizzes without an owner: premade ones go to the global
 *   bank, everything else belongs to the default school
 * - premade content that is missing (new in this version) is added back
 *
 * Nothing that already has a label or an owner is overwritten.
 */

const MIGRATION_KEY = "learning-world.lms.migration.v2";
const BUGS_SAMPLE_KEY = "learning-world.lms.catching-bugs-sample.v1";

let done = false;

function defaultSchoolId(): string | null {
    return schoolStore.getSnapshot()[0]?.id ?? null;
}

function gradeFromClassName(name: string): number {
    const match = name.match(/^\d+/);
    const grade = match ? Number(match[0]) : 1;
    return Math.min(12, Math.max(1, grade));
}

function ensureClass(schoolId: string, name: string): SchoolClass {
    const existing = classStore
        .getSnapshot()
        .find((klass) => klass.schoolId === schoolId && klass.name === name);
    if (existing) return existing;

    return classStore.upsert({
        id: `class-${schoolId}-${name.toLowerCase().replace(/\W+/g, "-")}`,
        schoolId,
        name,
        grade: gradeFromClassName(name),
        createdAt: new Date().toISOString(),
    });
}

function migrateStudents(schoolId: string | null): void {
    if (!schoolId) return;

    studentStore.mapAll((student) => {
        if (student.schoolId && student.classId) return student;

        const className = student.className.trim();
        const klass = className ? ensureClass(schoolId, className) : null;
        return {
            ...student,
            schoolId: student.schoolId ?? schoolId,
            classId: student.classId ?? klass?.id ?? null,
            className: klass?.name ?? student.className,
        };
    });
}

function migrateQuestions(schoolId: string | null): void {
    const premade = new Map(SAMPLE_QUESTION_BANK.map((q) => [q.id, q]));

    questionStore.mapAll((question) => {
        const seed = premade.get(question.id);
        if (seed) {
            // Premade questions keep their owner (global) and get labels when missing.
            return {
                ...question,
                schoolId: null,
                grade: question.grade ?? seed.grade,
                subject: question.subject ?? seed.subject,
                topic: question.topic ?? seed.topic,
                curriculum: question.curriculum ?? seed.curriculum,
                difficulty: question.difficulty ?? seed.difficulty,
                cognitiveLevel: question.cognitiveLevel ?? seed.cognitiveLevel,
                tags: question.tags ?? seed.tags,
            };
        }
        if (question.schoolId === undefined) {
            return { ...question, schoolId: schoolId ?? null };
        }
        return question;
    });

    // Add back premade questions that did not exist in the old version.
    const existing = new Set(questionStore.getSnapshot().map((q) => q.id));
    const missing: Question[] = seedQuestions().filter(
        (q) => !existing.has(q.id) && (SAMPLE_QUESTION_IDS.has(q.id) || q.schoolId !== null)
    );
    questionStore.upsertMany(missing);
}

function migrateQuizzes(schoolId: string | null): void {
    const seeds = new Map(seedQuizzes().map((quiz) => [quiz.id, quiz]));

    quizStore.mapAll((quiz) => {
        const seed = seeds.get(quiz.id);
        if (seed && seed.schoolId === null) {
            return {
                ...quiz,
                schoolId: null,
                grade: quiz.grade ?? seed.grade,
                subject: quiz.subject ?? seed.subject,
                topic: quiz.topic ?? seed.topic,
                curriculum: quiz.curriculum ?? seed.curriculum,
                difficulty: quiz.difficulty ?? seed.difficulty,
                cognitiveLevel: quiz.cognitiveLevel ?? seed.cognitiveLevel,
                tags: quiz.tags ?? seed.tags,
            };
        }
        if (quiz.schoolId === undefined) {
            return { ...quiz, schoolId: schoolId ?? null };
        }
        return quiz;
    });

    const existing = new Set(quizStore.getSnapshot().map((q) => q.id));
    const missing: Quiz[] = Array.from(seeds.values()).filter(
        (quiz) => !existing.has(quiz.id) && quiz.schoolId === null && quiz.id.startsWith("quiz-")
    );
    quizStore.upsertMany(missing);
}

/** Add only the new activity demo to existing installations, once, without re-seeding fishing. */
function addCatchingBugsSample(): void {
    if (window.localStorage.getItem(BUGS_SAMPLE_KEY)) return;
    const existing = new Set(quizStore.getSnapshot().map((quiz) => quiz.id));
    quizStore.upsertMany(seedQuizzes().filter(
        (quiz) => quiz.activityId === "catching_bugs" && !existing.has(quiz.id)
    ));
    window.localStorage.setItem(BUGS_SAMPLE_KEY, new Date().toISOString());
}

/**
 * Runs the migration once per browser. Safe to call often: the result is
 * memoised and it does nothing on the server.
 */
export function ensureLmsMigrated(): boolean {
    if (done) return true;
    if (typeof window === "undefined") return false;

    try {
        if (window.localStorage.getItem(MIGRATION_KEY)) {
            addCatchingBugsSample();
            done = true;
            return true;
        }

        // Touching the stores seeds them when they were never written.
        const schoolId = defaultSchoolId();
        migrateStudents(schoolId);
        migrateQuestions(schoolId);
        migrateQuizzes(schoolId);
        addCatchingBugsSample();

        window.localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
    } catch {
        // Storage unavailable: run in memory only.
    }

    done = true;
    return true;
}
