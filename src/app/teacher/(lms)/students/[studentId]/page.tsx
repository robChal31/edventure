import type { Metadata } from "next";
import StudentReport from "@/components/teacher/students/student-report";

export const metadata: Metadata = {
    title: "Student report · Learning World",
};

export default async function StudentReportPage(props: PageProps<"/teacher/students/[studentId]">) {
    const { studentId } = await props.params;
    return <StudentReport studentId={decodeURIComponent(studentId)} />;
}
