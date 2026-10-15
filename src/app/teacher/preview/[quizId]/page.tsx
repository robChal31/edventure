import type { Metadata } from "next";
import TeacherPreview from "@/components/teacher/preview/teacher-preview";
import StaffGate from "@/components/staff/staff-gate";

export const metadata: Metadata = {
    title: "Preview · Learning World",
};

export default async function PreviewPage(props: PageProps<"/teacher/preview/[quizId]">) {
    const { quizId } = await props.params;

    return (
        <main className="flex h-dvh w-full flex-col overflow-hidden">
            <StaffGate>
                <TeacherPreview quizId={decodeURIComponent(quizId)} />
            </StaffGate>
        </main>
    );
}
