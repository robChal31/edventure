import {
    questionFromDraft,
    sanitizeQuestion,
    type QuestionDraft,
} from "@/quiz/question-types";
import type { Question } from "@/quiz/types";
import { createId, nowIso } from "../ids";
import { seedQuestions } from "../seed";
import { createLocalCollection } from "../storage/local-collection";
import { removeQuestionFromQuizzes } from "./quiz-repository";

/** The teacher's question bank. */
export const questionStore = createLocalCollection<Question>({
    key: "learning-world.lms.questions.v1",
    sanitize: sanitizeQuestion,
    seed: seedQuestions,
});

/** Creates or updates a question from a validated editor draft. */
export function saveQuestion(draft: QuestionDraft): Question {
    const question = questionFromDraft(
        draft,
        draft.id ?? createId("question"),
        nowIso()
    );
    return questionStore.upsert(question);
}

export function duplicateQuestion(id: string): Question | null {
    const original = questionStore.get(id);
    if (!original) return null;

    const now = nowIso();
    return questionStore.upsert({
        ...original,
        id: createId("question"),
        text: `${original.text} (copy)`,
        createdAt: now,
        updatedAt: now,
    });
}

/** Deletes a question and removes it from every quiz that used it.
 * Past attempts keep their own snapshot, so reports are unaffected. */
export function deleteQuestion(id: string): void {
    questionStore.remove(id);
    removeQuestionFromQuizzes(id);
}

export function listSubjects(questions: readonly Question[]): string[] {
    const subjects = new Set<string>();
    questions.forEach((q) => {
        if (q.subject?.trim()) subjects.add(q.subject.trim());
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
}
