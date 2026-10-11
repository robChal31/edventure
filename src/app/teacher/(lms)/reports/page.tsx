import type { Metadata } from "next";
import ReportsOverview from "@/components/teacher/reports/reports-overview";

export const metadata: Metadata = {
    title: "Reports · Learning World",
};

export default function ReportsPage() {
    return <ReportsOverview />;
}
