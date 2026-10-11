"use client";

import { useState } from "react";
import { describeCorrectAnswer, gradeAnswer } from "@/quiz/grading";
import type { AnswerValue, Question } from "@/quiz/types";
import QuestionCard, { type AnswerReveal } from "@/components/student/questions/question-card";

/**
 * Renders a question exactly as students see it and grades answers
 * locally, so teachers can try a question before using it.
 * Remount (change `key`) to reset.
 */
export default function QuestionPreview({ question }: { question: Question }) {
    const [reveal, setReveal] = useState<AnswerReveal | null>(null);
    const [attempt, setAttempt] = useState(0);

    const answer = (value: AnswerValue) => {
        setReveal({
            correct: gradeAnswer(question, value),
            answer: value,
            correctAnswer: describeCorrectAnswer(question),
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <QuestionCard
                key={attempt}
                layout="inline"
                question={question}
                questionNumber={1}
                total={1}
                reveal={reveal}
                onAnswer={answer}
            />
            {reveal && (
                <button
                    type="button"
                    onClick={() => {
                        setReveal(null);
                        setAttempt((n) => n + 1);
                    }}
                    className="self-center text-xs font-semibold text-sky-300 hover:underline"
                >
                    ↺ Try again
                </button>
            )}
        </div>
    );
}
