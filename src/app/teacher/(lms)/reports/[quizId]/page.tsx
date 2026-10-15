import type { Metadata } from "next";
import QuizReport from "@/components/teacher/reports/quiz-report";

export const metadata: Metadata = {
    title: "Quiz report · Learning World",
};

export default async function QuizReportPage(props: PageProps<"/teacher/reports/[quizId]">) {
    const { quizId } = await props.params;
    return <QuizReport quizId={decodeURIComponent(quizId)} />;
}
