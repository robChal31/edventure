import type { Metadata } from "next";
import ClassesManager from "@/components/teacher/organisation/classes-manager";

export const metadata: Metadata = {
    title: "Classes · Learning World",
};

export default function ClassesPage() {
    return <ClassesManager />;
}
