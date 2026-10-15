import {
    COGNITIVE_LEVELS,
    DIFFICULTIES,
    GRADES,
    isCognitiveLevel,
    isCurriculumId,
    isDifficulty,
    normalizeTags,
    type CognitiveLevel,
    type CurriculumId,
    type Difficulty,
} from "./taxonomy";
import type {
    Classification,
    MultipleChoiceQuestion,
    Question,
    QuestionType,
    ShortAnswerQuestion,
    TrueFalseQuestion,
} from "./types";

/**
 * Per-type metadata, validation and sanitising for questions.
 * Used by the teacher editor (forms) and by storage (incoming data).
 */

export type QuestionTypeInfo = {
    type: QuestionType;
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
};

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeInfo> = {
    multiple_choice: {
        type: "multiple_choice",
        label: "Multiple choice",
        shortLabel: "Choice",
        icon: "🔤",
        description: "Pick the one correct option from 2–6 choices.",
    },
    true_false: {
        type: "true_false",
        label: "True or false",
        shortLabel: "True/False",
        icon: "⚖️",
        description: "Decide whether a statement is true or false.",
    },
    short_answer: {
        type: "short_answer",
        label: "Short answer",
        shortLabel: "Short",
        icon: "✏️",
        description: "Type a word or number. Several answers can be accepted.",
    },
};

export const QUESTION_TYPE_ORDER: QuestionType[] = [
    "multiple_choice",
    "true_false",
    "short_answer",
];

export const MC_MIN_OPTIONS = 2;
export const MC_MAX_OPTIONS = 6;

/** A draft for the editor — holds the fields of every type at once so
 * switching type in the form never loses what the teacher typed. */
export type QuestionDraft = {
    id?: string;
    type: QuestionType;
    text: string;
    explanation: string;
    options: string[];
    correctIndex: number;
    correctAnswer: boolean;
    acceptedAnswers: string[];
    caseSensitive: boolean;
    /** Classification labels (see taxonomy.ts). */
    grade: number | null;
    subject: string;
    topic: string;
    curriculum: CurriculumId | "";
    difficulty: Difficulty;
    cognitiveLevel: CognitiveLevel;
    /** Comma separated in the form. */
    tagsText: string;
    /** Owner; kept when editing so a question never changes school. */
    schoolId?: string | null;
    createdAt?: string;
};

export function emptyDraft(type: QuestionType = "multiple_choice"): QuestionDraft {
    return {
        type,
        text: "",
        explanation: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        correctAnswer: true,
        acceptedAnswers: [""],
        caseSensitive: false,
        grade: null,
        subject: "",
        topic: "",
        curriculum: "",
        difficulty: "medium",
        cognitiveLevel: "understand",
        tagsText: "",
    };
}

export function draftFromQuestion(question: Question): QuestionDraft {
    const draft: QuestionDraft = {
        ...emptyDraft(question.type),
        id: question.id,
        text: question.text,
        explanation: question.explanation ?? "",
        createdAt: question.createdAt,
        schoolId: question.schoolId,
        grade: question.grade ?? null,
        subject: question.subject ?? "",
        topic: question.topic ?? "",
        curriculum: question.curriculum ?? "",
        difficulty: question.difficulty ?? "medium",
        cognitiveLevel: question.cognitiveLevel ?? "understand",
        tagsText: (question.tags ?? []).join(", "),
    };

    switch (question.type) {
        case "multiple_choice":
            draft.options = [...question.options];
            draft.correctIndex = question.correctIndex;
            break;
        case "true_false":
            draft.correctAnswer = question.correctAnswer;
            break;
        case "short_answer":
            draft.acceptedAnswers = [...question.acceptedAnswers];
            draft.caseSensitive = Boolean(question.caseSensitive);
            break;
    }

    return draft;
}

/** Returns a list of human-readable problems; empty when valid. */
export function validateDraft(draft: QuestionDraft): string[] {
    const errors: string[] = [];

    if (!draft.text.trim()) {
        errors.push("Write the question text.");
    }

    // Labels: a question must say what it is for, so it can be found later.
    if (draft.grade === null) {
        errors.push("Choose the grade this question is for.");
    }
    if (!draft.subject.trim()) {
        errors.push("Choose a subject.");
    }
    if (!draft.topic.trim()) {
        errors.push("Name the topic (e.g. Fractions).");
    }
    if (!draft.curriculum) {
        errors.push("Choose the curriculum it follows.");
    }

    switch (draft.type) {
        case "multiple_choice": {
            const filled = draft.options.filter((option) => option.trim());
            if (filled.length < MC_MIN_OPTIONS) {
                errors.push(`Add at least ${MC_MIN_OPTIONS} answer options.`);
            }
            if (!draft.options[draft.correctIndex]?.trim()) {
                errors.push("Mark a filled-in option as the correct answer.");
            }
            const normalized = filled.map((option) => option.trim().toLowerCase());
            if (new Set(normalized).size !== normalized.length) {
                errors.push("Options must be different from each other.");
            }
            break;
        }
        case "true_false":
            break;
        case "short_answer":
            if (!draft.acceptedAnswers.some((answer) => answer.trim())) {
                errors.push("Add at least one accepted answer.");
            }
            break;
    }

    return errors;
}

/** Converts a (valid) draft into a clean question of the draft's type. */
export function questionFromDraft(
    draft: QuestionDraft,
    id: string,
    now: string
): Question {
    const base = {
        id,
        text: draft.text.trim(),
        explanation: draft.explanation.trim() || undefined,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
        schoolId: draft.schoolId,
        ...classificationFromDraft(draft),
    };

    switch (draft.type) {
        case "multiple_choice": {
            // Drop empty options while keeping the correct one pointed at.
            const correctText = draft.options[draft.correctIndex]?.trim() ?? "";
            const options = draft.options
                .map((option) => option.trim())
                .filter(Boolean);
            const question: MultipleChoiceQuestion = {
                ...base,
                type: "multiple_choice",
                options,
                correctIndex: Math.max(0, options.indexOf(correctText)),
            };
            return question;
        }
        case "true_false": {
            const question: TrueFalseQuestion = {
                ...base,
                type: "true_false",
                correctAnswer: draft.correctAnswer,
            };
            return question;
        }
        case "short_answer": {
            const seen = new Set<string>();
            const acceptedAnswers = draft.acceptedAnswers
                .map((answer) => answer.trim())
                .filter((answer) => {
                    const key = answer.toLowerCase();
                    if (!answer || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            const question: ShortAnswerQuestion = {
                ...base,
                type: "short_answer",
                acceptedAnswers,
                caseSensitive: draft.caseSensitive || undefined,
            };
            return question;
        }
    }
}

/** The classification labels of a draft, cleaned up. */
export function classificationFromDraft(
    draft: Pick<
        QuestionDraft,
        "grade" | "subject" | "topic" | "curriculum" | "difficulty" | "cognitiveLevel" | "tagsText"
    >
): Classification {
    return {
        grade: draft.grade ?? undefined,
        subject: draft.subject.trim() || undefined,
        topic: draft.topic.trim() || undefined,
        curriculum: isCurriculumId(draft.curriculum) ? draft.curriculum : undefined,
        difficulty: draft.difficulty,
        cognitiveLevel: draft.cognitiveLevel,
        tags: normalizeTags(draft.tagsText),
    };
}

/** Reads the classification fields of any stored record (question or quiz). */
export function sanitizeClassification(value: Record<string, unknown>): Classification {
    const grade =
        typeof value.grade === "number" &&
        (GRADES as readonly number[]).includes(value.grade)
            ? value.grade
            : undefined;

    return {
        grade,
        subject: typeof value.subject === "string" && value.subject.trim() ? value.subject : undefined,
        topic: typeof value.topic === "string" && value.topic.trim() ? value.topic : undefined,
        curriculum: isCurriculumId(value.curriculum) ? value.curriculum : undefined,
        difficulty: isDifficulty(value.difficulty) ? value.difficulty : undefined,
        cognitiveLevel: isCognitiveLevel(value.cognitiveLevel)
            ? value.cognitiveLevel
            : undefined,
        tags: Array.isArray(value.tags)
            ? normalizeTags(value.tags.filter((t): t is string => typeof t === "string"))
            : undefined,
    };
}

export const DIFFICULTY_ORDER = Object.keys(DIFFICULTIES) as Difficulty[];
export const COGNITIVE_ORDER = Object.keys(COGNITIVE_LEVELS) as CognitiveLevel[];

/** `null` = global, string = school, absent = legacy (migrated on load). */
export function readSchoolId(value: Record<string, unknown>): string | null | undefined {
    if (value.schoolId === null) return null;
    if (typeof value.schoolId === "string" && value.schoolId) return value.schoolId;
    return undefined;
}

/**
 * Accepts unknown stored data and returns a valid question or null.
 * Legacy questions (before question types existed) were multiple choice
 * without a `type` field — they are upgraded transparently.
 */
export function sanitizeQuestion(raw: unknown): Question | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;

    if (typeof value.id !== "string" || typeof value.text !== "string") {
        return null;
    }

    const base = {
        id: value.id,
        text: value.text,
        explanation:
            typeof value.explanation === "string" ? value.explanation : undefined,
        createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
        schoolId: readSchoolId(value),
        ...sanitizeClassification(value),
    };

    const type = value.type ?? "multiple_choice";

    if (type === "multiple_choice") {
        const options = Array.isArray(value.options)
            ? value.options.filter((o): o is string => typeof o === "string")
            : [];
        const correctIndex =
            typeof value.correctIndex === "number" ? value.correctIndex : -1;
        if (options.length < MC_MIN_OPTIONS || !options[correctIndex]) {
            return null;
        }
        return { ...base, type, options, correctIndex };
    }

    if (type === "true_false") {
        if (typeof value.correctAnswer !== "boolean") return null;
        return { ...base, type, correctAnswer: value.correctAnswer };
    }

    if (type === "short_answer") {
        const acceptedAnswers = Array.isArray(value.acceptedAnswers)
            ? value.acceptedAnswers.filter(
                  (a): a is string => typeof a === "string" && a.trim() !== ""
              )
            : [];
        if (acceptedAnswers.length === 0) return null;
        return {
            ...base,
            type,
            acceptedAnswers,
            caseSensitive: value.caseSensitive === true || undefined,
        };
    }

    return null;
}
