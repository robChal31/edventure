let nextRequestId = 0;

/** Result effects wait for a receipt sent AFTER React has removed the question DOM. */
export class QuestionCloseGate {
    #pending: { id: number; resolve: () => void } | null = null;

    request(resolve: () => void): number {
        const id = ++nextRequestId;
        this.#pending = { id, resolve };
        return id;
    }

    acknowledge(id: number): void {
        const pending = this.#pending;
        if (!pending || pending.id !== id) return;
        this.#pending = null;
        pending.resolve();
    }

    cancel(): void { this.#pending = null; }
}
