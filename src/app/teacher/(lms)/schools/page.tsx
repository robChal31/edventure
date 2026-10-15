import type { Metadata } from "next";
import SchoolsManager from "@/components/teacher/organisation/schools-manager";

export const metadata: Metadata = {
    title: "Schools · Learning World",
};

export default function SchoolsPage() {
    return <SchoolsManager />;
}
