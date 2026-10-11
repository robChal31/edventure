import type { Metadata } from "next";
import StudentPlay from "@/components/student/student-play";

export const metadata: Metadata = {
    title: "Play · Learning World",
};

export default function StudentPlayPage() {
    return (
        <main className="flex h-dvh w-full flex-col overflow-hidden">
            <StudentPlay />
        </main>
    );
}
