import type { Metadata } from "next";
import StaffLogin from "@/components/staff/staff-login";

export const metadata: Metadata = {
    title: "Staff login · Learning World",
};

export default function LoginPage() {
    return <StaffLogin />;
}
