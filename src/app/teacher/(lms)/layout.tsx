import type { Metadata } from "next";
import TeacherShell from "@/components/teacher/teacher-shell";

export const metadata: Metadata = {
    title: "Teacher · Learning World",
};

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
    return <TeacherShell>{children}</TeacherShell>;
}
