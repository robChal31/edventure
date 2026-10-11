import type { Metadata } from "next";
import StudentManager from "@/components/teacher/students/student-manager";

export const metadata: Metadata = {
    title: "Students · Learning World",
};

export default function StudentsPage() {
    return <StudentManager />;
}
