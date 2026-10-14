import type { Metadata } from "next";
import StaffManager from "@/components/teacher/organisation/staff-manager";

export const metadata: Metadata = {
    title: "Staff · Learning World",
};

export default function StaffPage() {
    return <StaffManager />;
}
