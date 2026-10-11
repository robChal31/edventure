import type { Metadata } from "next";
import TeacherPreview from "@/components/teacher/preview/teacher-preview";

export const metadata: Metadata = {
    title: "Preview · Learning World",
};

export default async function PreviewPage(props: PageProps<"/teacher/preview/[quizId]">) {
    const { quizId } = await props.params;

    return (
        <main className="flex h-dvh w-full flex-col overflow-hidden">
            <TeacherPreview quizId={decodeURIComponent(quizId)} />
        </main>
    );
}
