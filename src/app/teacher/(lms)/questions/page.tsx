import type { Metadata } from "next";
import QuestionBank from "@/components/teacher/questions/question-bank";

export const metadata: Metadata = {
    title: "Questions · Learning World",
};

export default function QuestionsPage() {
    return <QuestionBank />;
}
