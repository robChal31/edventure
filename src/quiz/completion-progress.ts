/** Goal-gradient feedback is about finishing the work, never about achieving a perfect score. */
export function completionProgress(answered: number, total: number): { completed: number; percent: number; remaining: number; nearFinish: boolean } {
    const safeTotal = Number.isSafeInteger(total) && total > 0 ? total : 0;
    const completed = Math.min(safeTotal, Math.max(0, Number.isFinite(answered) ? Math.floor(answered) : 0));
    const remaining = safeTotal - completed;
    return { completed, remaining, percent: safeTotal ? completed / safeTotal * 100 : 0,
        nearFinish: safeTotal > 1 && completed / safeTotal >= 0.75 && remaining > 0 };
}
