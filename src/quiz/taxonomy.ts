/**
 * Classification labels for questions and quizzes. These make the question
 * bank searchable and give the data a structure reports can group by:
 * which grade a question is for, which subject and topic it covers, which
 * curriculum it follows and how hard it is.
 *
 * Kept as plain data (ids + labels) so new values are a one-line change.
 */

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type Grade = (typeof GRADES)[number];

export type GradeStage = "elementary" | "middle" | "high";

export const GRADE_STAGES: Record<GradeStage, { label: string; grades: Grade[] }> = {
    elementary: { label: "Elementary", grades: [1, 2, 3, 4, 5, 6] },
    middle: { label: "Middle school", grades: [7, 8, 9] },
    high: { label: "High school", grades: [10, 11, 12] },
};

export function stageOfGrade(grade: number): GradeStage {
    if (grade <= 6) return "elementary";
    if (grade <= 9) return "middle";
    return "high";
}

export function gradeLabel(grade: number | null | undefined): string {
    return typeof grade === "number" ? `Grade ${grade}` : "No grade";
}

export const SUBJECTS = [
    "Mathematics",
    "Science",
    "English",
    "Indonesian",
    "Social Studies",
    "Geography",
    "History",
    "Civics",
    "Arts",
    "Physical Education",
    "Religion",
    "Computer Science",
    "Other",
] as const;

export type CurriculumId = "merdeka" | "k13" | "cambridge" | "ib" | "general";

export const CURRICULA: Record<CurriculumId, { label: string; hint: string }> = {
    merdeka: { label: "Kurikulum Merdeka", hint: "Indonesia, Merdeka Curriculum" },
    k13: { label: "Kurikulum 2013", hint: "Indonesia, K-13" },
    cambridge: { label: "Cambridge", hint: "Cambridge Primary / Lower Secondary" },
    ib: { label: "IB", hint: "International Baccalaureate PYP / MYP" },
    general: { label: "General / other", hint: "Not tied to one curriculum" },
};

export const CURRICULUM_ORDER: CurriculumId[] = ["merdeka", "k13", "cambridge", "ib", "general"];

export function isCurriculumId(value: unknown): value is CurriculumId {
    return typeof value === "string" && value in CURRICULA;
}

export const DIFFICULTIES = {
    easy: { label: "Easy", icon: "🟢" },
    medium: { label: "Medium", icon: "🟡" },
    hard: { label: "Hard", icon: "🔴" },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;

export function isDifficulty(value: unknown): value is Difficulty {
    return typeof value === "string" && value in DIFFICULTIES;
}

/** Cognitive level (Bloom's taxonomy, simplified). */
export const COGNITIVE_LEVELS = {
    remember: { label: "Remember", hint: "Recall facts and terms" },
    understand: { label: "Understand", hint: "Explain ideas in own words" },
    apply: { label: "Apply", hint: "Use a method in a new situation" },
    analyze: { label: "Analyze", hint: "Compare, break down, reason" },
} as const;

export type CognitiveLevel = keyof typeof COGNITIVE_LEVELS;

export function isCognitiveLevel(value: unknown): value is CognitiveLevel {
    return typeof value === "string" && value in COGNITIVE_LEVELS;
}

/** Tags are short lowercase words, comma separated in the UI. */
export function normalizeTags(input: readonly string[] | string): string[] {
    const raw = typeof input === "string" ? input.split(",") : input;
    const seen = new Set<string>();
    raw.forEach((tag) => {
        const clean = tag.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
        if (clean) seen.add(clean);
    });
    return Array.from(seen);
}

/** Human-readable summary, e.g. "Grade 4 · Mathematics · Fractions". */
export function classificationSummary(parts: {
    grade?: number | null;
    subject?: string | null;
    topic?: string | null;
    curriculum?: string | null;
}): string {
    return [
        typeof parts.grade === "number" ? gradeLabel(parts.grade) : null,
        parts.subject || null,
        parts.topic || null,
        isCurriculumId(parts.curriculum) ? CURRICULA[parts.curriculum].label : null,
    ]
        .filter(Boolean)
        .join(" · ");
}
