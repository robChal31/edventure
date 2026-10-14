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

/** The question bank: the global premade bank plus each school's questions. */
export const questionStore = createLocalCollection<Question>({
    key: "learning-world.lms.questions.v1",
    sanitize: sanitizeQuestion,
    seed: seedQuestions,
});

/** Creates or updates a question from a validated editor draft. */
export function saveQuestion(draft: QuestionDraft): Question {
    const question = questionFromDraft(
        { ...draft, schoolId: draft.schoolId ?? null },
        draft.id ?? createId("question"),
        nowIso()
    );
    return questionStore.upsert(question);
}

/** Copies a question into a school (or the global bank when schoolId is null). */
export function copyQuestionTo(id: string, schoolId: string | null): Question | null {
    const original = questionStore.get(id);
    if (!original) return null;

    const now = nowIso();
    return questionStore.upsert({
        ...original,
        id: createId("question"),
        schoolId,
        createdAt: now,
        updatedAt: now,
    });
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

export function listTopics(questions: readonly Question[]): string[] {
    const topics = new Set<string>();
    questions.forEach((q) => {
        if (q.topic?.trim()) topics.add(q.topic.trim());
    });
    return Array.from(topics).sort((a, b) => a.localeCompare(b));
}

/** Questions missing one of the labels that make them findable. */
export function isUnlabelled(question: Question): boolean {
    return (
        question.grade === undefined ||
        !question.subject ||
        !question.topic ||
        question.curriculum === undefined
    );
}
