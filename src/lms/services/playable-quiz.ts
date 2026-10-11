import type { PlayableQuiz, Question } from "@/quiz/types";
import { isQuizAssignedTo } from "../repositories/quiz-repository";
import type { Quiz } from "../types";

/** The quiz's questions in authored order, skipping deleted ones. */
export function resolveQuizQuestions(
    quiz: Pick<Quiz, "questionIds">,
    questions: readonly Question[]
): Question[] {
    const byId = new Map(questions.map((question) => [question.id, question]));
    return quiz.questionIds
        .map((id) => byId.get(id))
        .filter((question): question is Question => question !== undefined);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Snapshot of a quiz ready for the game (shuffled if the quiz asks for it). */
export function toPlayableQuiz(
    quiz: Quiz,
    questions: readonly Question[],
    random: () => number = Math.random
): PlayableQuiz {
    const resolved = resolveQuizQuestions(quiz, questions);
    return {
        id: quiz.id,
        name: quiz.name,
        activityId: quiz.activityId,
        questions: quiz.shuffleQuestions ? shuffled(resolved, random) : resolved,
    };
}

/** Published quizzes assigned to the student that have playable questions. */
export function questsForStudent(
    studentId: string,
    quizzes: readonly Quiz[],
    questions: readonly Question[]
): Quiz[] {
    return quizzes.filter(
        (quiz) =>
            quiz.published &&
            isQuizAssignedTo(quiz, studentId) &&
            resolveQuizQuestions(quiz, questions).length > 0
    );
}
