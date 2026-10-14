"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useLmsReady, useSignedInStaff } from "@/lms/hooks";
import { getSignedInStaffId, subscribeStaffSession } from "@/lms/session/staff-session";
import { Skeleton } from "@/components/ui/panels";

/**
 * Shows the LMS only to a signed-in staff account. Everyone else is sent to
 * the staff login page. Also waits for the data upgrade to finish.
 */
export default function StaffGate({ children }: { children: ReactNode }) {
    const router = useRouter();
    const ready = useLmsReady();
    const staff = useSignedInStaff();
    // Distinguishes "not signed in" from "signed in, account not loaded yet".
    const signedInId = useSyncExternalStore(
        subscribeStaffSession,
        getSignedInStaffId,
        () => null
    );

    useEffect(() => {
        if (ready && !signedInId) {
            router.replace("/login");
        }
    }, [ready, signedInId, router]);

    if (!ready || (signedInId && !staff)) {
        return (
            <div className="p-6">
                <Skeleton rows={3} />
            </div>
        );
    }

    if (!staff) return null;

    return <>{children}</>;
}
