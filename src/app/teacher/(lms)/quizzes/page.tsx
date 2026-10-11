import type { Metadata } from "next";
import QuizManager from "@/components/teacher/quizzes/quiz-manager";

export const metadata: Metadata = {
    title: "Quizzes · Learning World",
};

export default function QuizzesPage() {
    return <QuizManager />;
}
