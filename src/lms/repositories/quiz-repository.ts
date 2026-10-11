import { ACTIVITIES } from "@/quiz/activities";
import type { ActivityId } from "@/quiz/types";
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
        id: value.id,
        name: value.name,
        description: typeof value.description === "string" ? value.description : "",
        activityId,
        questionIds: Array.isArray(value.questionIds)
            ? value.questionIds.filter((id): id is string => typeof id === "string")
            : [],
        shuffleQuestions: value.shuffleQuestions === true,
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

export type QuizDraft = Omit<Quiz, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
};

export function emptyQuizDraft(): QuizDraft {
    return {
        name: "",
        description: "",
        activityId: "fishing",
        questionIds: [],
        shuffleQuestions: false,
        published: true,
        assignment: { mode: "everyone" },
    };
}

export function draftFromQuiz(quiz: Quiz): QuizDraft {
    return {
        ...quiz,
        questionIds: [...quiz.questionIds],
        assignment:
            quiz.assignment.mode === "students"
                ? { mode: "students", studentIds: [...quiz.assignment.studentIds] }
                : { mode: "everyone" },
    };
}

export function validateQuizDraft(draft: QuizDraft): string[] {
    const errors: string[] = [];
    if (!draft.name.trim()) {
        errors.push("Give the quiz a name.");
    }
    if (draft.questionIds.length === 0) {
        errors.push("Add at least one question.");
    }
    if (
        draft.assignment.mode === "students" &&
        draft.assignment.studentIds.length === 0
    ) {
        errors.push("Pick at least one student, or assign it to everyone.");
    }
    return errors;
}

export function saveQuiz(draft: QuizDraft): Quiz {
    const now = nowIso();
    const quiz: Quiz = {
        ...draft,
        id: draft.id ?? createId("quiz"),
        name: draft.name.trim(),
        description: draft.description.trim(),
        questionIds: Array.from(new Set(draft.questionIds)),
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
    };
    return quizStore.upsert(quiz);
}

export function duplicateQuiz(id: string): Quiz | null {
    const original = quizStore.get(id);
    if (!original) return null;
    const now = nowIso();
    return quizStore.upsert({
        ...draftFromQuiz(original),
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

export function isQuizAssignedTo(quiz: Quiz, studentId: string): boolean {
    return (
        quiz.assignment.mode === "everyone" ||
        quiz.assignment.studentIds.includes(studentId)
    );
}

export function countQuizzesUsingQuestion(
    quizzes: readonly Quiz[],
    questionId: string
): number {
    return quizzes.filter((quiz) => quiz.questionIds.includes(questionId)).length;
}
