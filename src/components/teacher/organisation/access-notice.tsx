import { EmptyState } from "@/components/ui/panels";

export function NoAccess({ children }: { children: React.ReactNode }) {
    return (
        <EmptyState icon="🔒" title="NOT FOR YOUR ROLE">
            {children}
        </EmptyState>
    );
}
