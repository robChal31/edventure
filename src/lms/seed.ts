import { SAMPLE_QUESTION_BANK } from "@/quiz/question-bank";
import type { Question } from "@/quiz/types";
import { readLegacyRooms } from "./storage/legacy-rooms";
import type { Quiz, School, SchoolClass, StaffUser, Student } from "./types";

/**
 * First-run content so a fresh install is immediately playable.
 *
 * - One developer (super admin) owns the global bank and premade quizzes.
 * - Two demo schools, each with an admin, classes, teachers and students.
 *
 * Each collection seeds itself only when its storage key is empty, and
 * everything can be edited or deleted afterwards.
 *
 * Demo logins (staff, username / password) are listed on the login page.
 */

export const DEMO_SCHOOL_IDS = {
    harapan: "school-harapan",
    cendekia: "school-cendekia",
} as const;

const SEED_DATE = "2026-01-05T08:00:00.000Z";

export function seedSchools(): School[] {
    return [
        { id: DEMO_SCHOOL_IDS.harapan, name: "SD Harapan Bangsa", code: "HBG", createdAt: SEED_DATE },
        { id: DEMO_SCHOOL_IDS.cendekia, name: "SMP Cendekia", code: "CDK", createdAt: SEED_DATE },
    ];
}

export function seedClasses(): SchoolClass[] {
    const at = (id: string, schoolId: string, name: string, grade: number): SchoolClass => ({
        id,
        schoolId,
        name,
        grade,
        createdAt: SEED_DATE,
    });
    return [
        at("class-4a", DEMO_SCHOOL_IDS.harapan, "4A", 4),
        at("class-4b", DEMO_SCHOOL_IDS.harapan, "4B", 4),
        at("class-5a", DEMO_SCHOOL_IDS.harapan, "5A", 5),
        at("class-7a", DEMO_SCHOOL_IDS.cendekia, "7A", 7),
    ];
}

export function seedStaff(): StaffUser[] {
    const staff = (
        id: string,
        role: StaffUser["role"],
        name: string,
        username: string,
        password: string,
        schoolId: string | null,
        classIds: string[] = []
    ): StaffUser => ({
        id,
        role,
        name,
        username,
        password,
        schoolId,
        classIds,
        createdAt: SEED_DATE,
    });
    return [
        staff("staff-dev", "super_admin", "Developer", "dev", "dev12345", null),
        staff("staff-admin-harapan", "school_admin", "Pak Andi", "admin.harapan", "admin123", DEMO_SCHOOL_IDS.harapan),
        staff("staff-teacher-sari", "teacher", "Bu Sari", "bu.sari", "guru123", DEMO_SCHOOL_IDS.harapan, ["class-4a", "class-4b"]),
        staff("staff-teacher-budi", "teacher", "Pak Budi", "pak.budi", "guru123", DEMO_SCHOOL_IDS.harapan, ["class-5a"]),
        staff("staff-admin-cendekia", "school_admin", "Bu Rina", "admin.cendekia", "admin123", DEMO_SCHOOL_IDS.cendekia),
    ];
}

export function seedStudents(): Student[] {
    const student = (
        id: string,
        name: string,
        schoolId: string,
        classId: string,
        className: string,
        code: string,
        avatar: string
    ): Student => ({ id, name, schoolId, classId, className, code, avatar, createdAt: SEED_DATE });

    return [
        student("student-demo-ani", "Ani", DEMO_SCHOOL_IDS.harapan, "class-4a", "4A", "TUNA11", "🐠"),
        student("student-demo-budi", "Budi", DEMO_SCHOOL_IDS.harapan, "class-4a", "4A", "CRAB22", "🦀"),
        student("student-demo-citra", "Citra", DEMO_SCHOOL_IDS.harapan, "class-4b", "4B", "SEAL33", "🦭"),
        student("student-demo-dewi", "Dewi", DEMO_SCHOOL_IDS.cendekia, "class-7a", "7A", "OTTER44", "🦦"),
    ];
}

/** School-owned questions: the school admin's own content. */
const SCHOOL_QUESTIONS: Question[] = [
    {
        id: "harapan-q-shells",
        type: "multiple_choice",
        text: "Ani has 4 bags. Each bag has 6 shells. How many shells does she have?",
        options: ["10", "18", "24", "30"],
        correctIndex: 2,
        explanation: "4 groups of 6 is 24.",
        schoolId: DEMO_SCHOOL_IDS.harapan,
        grade: 4,
        subject: "Mathematics",
        topic: "Multiplication word problems",
        curriculum: "merdeka",
        difficulty: "easy",
        cognitiveLevel: "apply",
        tags: ["multiplication", "word-problem"],
        createdAt: SEED_DATE,
        updatedAt: SEED_DATE,
    },
    {
        id: "harapan-q-states",
        type: "true_false",
        text: "Water can exist as a solid, a liquid and a gas.",
        correctAnswer: true,
        explanation: "Ice, water and water vapour are the three states of water.",
        schoolId: DEMO_SCHOOL_IDS.harapan,
        grade: 5,
        subject: "Science",
        topic: "States of matter",
        curriculum: "merdeka",
        difficulty: "easy",
        cognitiveLevel: "remember",
        tags: ["matter"],
        createdAt: SEED_DATE,
        updatedAt: SEED_DATE,
    },
];

export function seedQuestions(): Question[] {
    const legacy = readLegacyRooms().questions;
    const ids = new Set(SAMPLE_QUESTION_BANK.map((q) => q.id));
    const imported = legacy.filter((q) => !ids.has(q.id));

    return [...SAMPLE_QUESTION_BANK, ...SCHOOL_QUESTIONS, ...imported].map((question) => ({
        ...question,
        schoolId: question.schoolId === undefined ? null : question.schoolId,
        createdAt: question.createdAt ?? SEED_DATE,
        updatedAt: question.updatedAt ?? SEED_DATE,
    }));
}

const GLOBAL_QUIZ_DEFAULTS = {
    schoolId: null,
    activityId: "fishing" as const,
    shuffleQuestions: false,
    published: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
};

export function seedQuizzes(): Quiz[] {
    const samples: Quiz[] = [
        {
            ...GLOBAL_QUIZ_DEFAULTS,
            id: "quiz-sample-ocean",
            name: "Ocean Explorers",
            description: "A mixed warm-up: multiple choice, true/false and short answers about the sea.",
            questionIds: ["bank-12", "bank-tf-1", "bank-sa-3", "bank-14", "bank-tf-2", "bank-9"],
            assignment: { mode: "everyone" },
            grade: 3,
            subject: "Science",
            topic: "Ocean life",
            curriculum: "merdeka",
            difficulty: "easy",
            cognitiveLevel: "remember",
            tags: ["ocean", "animals"],
        },
        {
            ...GLOBAL_QUIZ_DEFAULTS,
            id: "quiz-sample-math",
            name: "Quick Math Catch",
            description: "Five fast number questions.",
            questionIds: ["bank-1", "bank-sa-1", "bank-tf-3", "bank-2", "bank-13"],
            shuffleQuestions: true,
            assignment: { mode: "everyone" },
            grade: 2,
            subject: "Mathematics",
            topic: "Mental arithmetic",
            curriculum: "merdeka",
            difficulty: "easy",
            cognitiveLevel: "apply",
            tags: ["numbers"],
        },
        {
            ...GLOBAL_QUIZ_DEFAULTS,
            id: "quiz-premade-fractions",
            name: "Fraction Frenzy",
            description: "Fractions and multiplication for grade 5.",
            questionIds: ["pre-math-g5-fractions", "bank-3", "bank-2"],
            assignment: { mode: "everyone" },
            grade: 5,
            subject: "Mathematics",
            topic: "Fractions",
            curriculum: "merdeka",
            difficulty: "medium",
            cognitiveLevel: "apply",
            tags: ["fractions"],
        },
    ];

    return [
        ...samples,
        ...readLegacyRooms().quizzes.map((quiz) => ({ ...quiz, schoolId: null })),
    ];
}
