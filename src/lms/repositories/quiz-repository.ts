import { ACTIVITIES } from "@/quiz/activities";
import { isCurriculumId } from "@/quiz/taxonomy";
import { sanitizeClassification, classificationFromDraft, readSchoolId } from "@/quiz/question-types";
import type { ActivityId, Question } from "@/quiz/types";
import type { CognitiveLevel, CurriculumId, Difficulty } from "@/quiz/taxonomy";
import { isQuizAssignedTo } from "../access";
import { createId, nowIso } from "../ids";
import { seedQuizzes } from "../seed";
import { createLocalCollection } from "../storage/local-collection";
import type { Quiz, QuizAssignment } from "../types";

function sanitizeAssignment(raw: unknown): QuizAssignment {
    if (raw && typeof raw === "object") {
        const value = raw as Record<string, unknown>;
        if (value.mode === "students" && Array.isArray(value.studentIds)) {
            return {
                mode: "students",
                studentIds: value.studentIds.filter(
                    (id): id is string => typeof id === "string"
                ),
            };
        }
        if (value.mode === "classes" && Array.isArray(value.classIds)) {
            return {
                mode: "classes",
                classIds: value.classIds.filter((id): id is string => typeof id === "string"),
            };
        }
    }
    return { mode: "everyone" };
}

function sanitizeQuiz(raw: unknown): Quiz | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;

    if (typeof value.id !== "string" || typeof value.name !== "string") {
        return null;
    }

    const activityId = ACTIVITIES.some((a) => a.id === value.activityId)
        ? (value.activityId as ActivityId)
        : "fishing";

    return {
        ...sanitizeClassification(value),
        id: value.id,
        name: value.name,
        description: typeof value.description === "string" ? value.description : "",
        activityId,
        questionIds: Array.isArray(value.questionIds)
            ? value.questionIds.filter((id): id is string => typeof id === "string")
            : [],
        shuffleQuestions: value.shuffleQuestions === true,
        schoolId: readSchoolId(value),
        published: value.published !== false,
        assignment: sanitizeAssignment(value.assignment),
        createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : nowIso(),
    };
}

export const quizStore = createLocalCollection<Quiz>({
    key: "learning-world.lms.quizzes.v1",
    sanitize: sanitizeQuiz,
    seed: seedQuizzes,
});

export type QuizDraft = {
    id?: string;
    name: string;
    description: string;
    activityId: ActivityId;
    questionIds: string[];
    shuffleQuestions: boolean;
    published: boolean;
    assignment: QuizAssignment;
    /** Owner; null for the global bank. Set from the author's school. */
    schoolId?: string | null;
    grade: number | null;
    subject: string;
    topic: string;
    curriculum: CurriculumId | "";
    difficulty: Difficulty;
    cognitiveLevel: CognitiveLevel;
    tagsText: string;
    createdAt?: string;
};

export function emptyQuizDraft(schoolId: string | null = null): QuizDraft {
    return {
        name: "",
        description: "",
        activityId: "fishing",
        questionIds: [],
        shuffleQuestions: false,
        published: true,
        assignment: { mode: "everyone" },
        schoolId,
        grade: null,
        subject: "",
        topic: "",
        curriculum: "",
        difficulty: "medium",
        cognitiveLevel: "understand",
        tagsText: "",
    };
}

export function draftFromQuiz(quiz: Quiz): QuizDraft {
    return {
        id: quiz.id,
        name: quiz.name,
        description: quiz.description,
        activityId: quiz.activityId,
        questionIds: [...quiz.questionIds],
        shuffleQuestions: quiz.shuffleQuestions,
        published: quiz.published,
        assignment:
            quiz.assignment.mode === "students"
                ? { mode: "students", studentIds: [...quiz.assignment.studentIds] }
                : quiz.assignment.mode === "classes"
                  ? { mode: "classes", classIds: [...quiz.assignment.classIds] }
                  : { mode: "everyone" },
        schoolId: quiz.schoolId,
        grade: quiz.grade ?? null,
        subject: quiz.subject ?? "",
        topic: quiz.topic ?? "",
        curriculum: quiz.curriculum ?? "",
        difficulty: quiz.difficulty ?? "medium",
        cognitiveLevel: quiz.cognitiveLevel ?? "understand",
        tagsText: (quiz.tags ?? []).join(", "),
        createdAt: quiz.createdAt,
    };
}

export function validateQuizDraft(draft: QuizDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) {
        errors.push("Give the quiz a name.");
    }
    if (draft.grade === null) {
        errors.push("Choose the grade this quiz is for.");
    }
    if (!draft.curriculum || !isCurriculumId(draft.curriculum)) {
        errors.push("Choose the curriculum it follows.");
    }
    if (draft.questionIds.length === 0) {
        errors.push("Add at least one question.");
    }
    if (draft.assignment.mode === "students" && draft.assignment.studentIds.length === 0) {
        errors.push("Pick at least one student, or choose another audience.");
    }
    if (draft.assignment.mode === "classes" && draft.assignment.classIds.length === 0) {
        errors.push("Pick at least one class, or choose another audience.");
    }
    return errors;
}

export function saveQuiz(draft: QuizDraft): Quiz {
    const now = nowIso();
    const existing = draft.id ? quizStore.get(draft.id) : undefined;
    const quiz: Quiz = {
        ...classificationFromDraft({
            grade: draft.grade,
            subject: draft.subject,
            topic: draft.topic,
            curriculum: draft.curriculum,
            difficulty: draft.difficulty,
            cognitiveLevel: draft.cognitiveLevel,
            tagsText: draft.tagsText,
        }),
        id: draft.id ?? createId("quiz"),
        name: draft.name.trim(),
        description: draft.description.trim(),
        activityId: draft.activityId,
        questionIds: Array.from(new Set(draft.questionIds)),
        shuffleQuestions: draft.shuffleQuestions,
        published: draft.published,
        assignment: draft.assignment,
        schoolId: existing ? existing.schoolId : draft.schoolId ?? null,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
    };
    return quizStore.upsert(quiz);
}

/** A copy of a quiz owned by `schoolId` (used to adopt a global quiz). */
export function copyQuizToSchool(id: string, schoolId: string, questionIds: string[]): Quiz | null {
    const original = quizStore.get(id);
    if (!original) return null;
    const now = nowIso();
    return quizStore.upsert({
        ...original,
        id: createId("quiz"),
        name: `${original.name} (copy)`,
        questionIds,
        schoolId,
        published: false,
        assignment: { mode: "everyone" },
        createdAt: now,
        updatedAt: now,
    });
}

export function duplicateQuiz(id: string): Quiz | null {
    const original = quizStore.get(id);
    if (!original) return null;
    const now = nowIso();
    return quizStore.upsert({
        ...original,
        id: createId("quiz"),
        name: `${original.name} (copy)`,
        published: false,
        createdAt: now,
        updatedAt: now,
    });
}

export function deleteQuiz(id: string): void {
    quizStore.remove(id);
}

export function setQuizPublished(id: string, published: boolean): void {
    quizStore.update(id, (quiz) => ({ ...quiz, published, updatedAt: nowIso() }));
}

export function removeQuestionFromQuizzes(questionId: string): void {
    quizStore.mapAll((quiz) =>
        quiz.questionIds.includes(questionId)
            ? {
                  ...quiz,
                  questionIds: quiz.questionIds.filter((id) => id !== questionId),
                  updatedAt: nowIso(),
              }
            : quiz
    );
}

export function removeStudentFromAssignments(studentId: string): void {
    quizStore.mapAll((quiz) =>
        quiz.assignment.mode === "students" &&
        quiz.assignment.studentIds.includes(studentId)
            ? {
                  ...quiz,
                  assignment: {
                      mode: "students",
                      studentIds: quiz.assignment.studentIds.filter(
                          (id) => id !== studentId
                      ),
                  },
              }
            : quiz
    );
}

export function removeClassFromAssignments(classId: string): void {
    quizStore.mapAll((quiz) =>
        quiz.assignment.mode === "classes" && quiz.assignment.classIds.includes(classId)
            ? {
                  ...quiz,
                  assignment: {
                      mode: "classes",
                      classIds: quiz.assignment.classIds.filter((id) => id !== classId),
                  },
              }
            : quiz
    );
}

export { isQuizAssignedTo };

export function countQuizzesUsingQuestion(
    quizzes: readonly Quiz[],
    questionId: string
): number {
    return quizzes.filter((quiz) => quiz.questionIds.includes(questionId)).length;
}

/** Questions whose grade does not match the quiz's grade (for a warning). */
export function gradeMismatches(quiz: Pick<Quiz, "grade">, questions: readonly Question[]): number {
    if (quiz.grade === undefined) return 0;
    return questions.filter((q) => q.grade !== undefined && q.grade !== quiz.grade).length;
}
