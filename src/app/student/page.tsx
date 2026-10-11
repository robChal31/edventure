import type { Metadata } from "next";
import StudentLogin from "@/components/student/student-login";

export const metadata: Metadata = {
    title: "Student login · Learning World",
};

export default function StudentLoginPage() {
    return (
        <main className="flex min-h-dvh flex-1 flex-col">
            <StudentLogin />
        </main>
    );
}
