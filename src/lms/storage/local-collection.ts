/**
 * A tiny reactive collection persisted in `localStorage`.
 *
 * This is the only module that touches browser storage for LMS data —
 * repositories build on it, React reads it through `useSyncExternalStore`.
 * To move to a real backend later, replace this module (or the
 * repositories) without touching any UI.
 *
 * - SSR-safe: on the server the snapshot is always an empty array.
 * - Snapshots are referentially stable until the data changes.
 * - Other tabs stay in sync through the `storage` event (e.g. the teacher
 *   dashboard updates live while a student finishes a quiz in another tab).
 */

export type Entity = { id: string };

export type LocalCollection<T extends Entity> = {
    subscribe(listener: () => void): () => void;
    getSnapshot(): readonly T[];
    getServerSnapshot(): readonly T[];
    get(id: string): T | undefined;
    upsert(item: T): T;
    upsertMany(items: readonly T[]): void;
    update(id: string, updater: (item: T) => T): T | undefined;
    remove(id: string): void;
    removeWhere(predicate: (item: T) => boolean): number;
    /** Applies a transformation to every item; persists only if something changed. */
    mapAll(mapper: (item: T) => T): void;
};

export type LocalCollectionOptions<T extends Entity> = {
    /** localStorage key. Version it (".v1") so the shape can evolve. */
    key: string;
    /** Validates one stored item; return null to drop it. */
    sanitize: (raw: unknown) => T | null;
    /** Initial content, used only when the key has never been written. */
    seed?: () => T[];
};

const EMPTY: readonly never[] = Object.freeze([]);

export function createLocalCollection<T extends Entity>(
    options: LocalCollectionOptions<T>
): LocalCollection<T> {
    const { key, sanitize, seed } = options;
    const listeners = new Set<() => void>();
    let cache: readonly T[] | null = null;
    let storageListenerAttached = false;

    const hasWindow = () => typeof window !== "undefined";

    const write = (items: readonly T[]): void => {
        try {
            window.localStorage.setItem(key, JSON.stringify(items));
        } catch {
            // Storage full / unavailable — keep working in memory.
        }
    };

    const read = (): readonly T[] => {
        if (!hasWindow()) return EMPTY;

        try {
            const raw = window.localStorage.getItem(key);

            if (raw === null) {
                const seeded = seed?.() ?? [];
                write(seeded);
                return seeded;
            }

            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) return EMPTY;

            return parsed
                .map((item) => sanitize(item))
                .filter((item): item is T => item !== null);
        } catch {
            return EMPTY;
        }
    };

    const emit = (): void => {
        listeners.forEach((listener) => listener());
    };

    const commit = (next: readonly T[]): void => {
        cache = next;
        if (hasWindow()) write(next);
        emit();
    };

    const onStorage = (event: StorageEvent): void => {
        if (event.key === key || event.key === null) {
            cache = null;
            emit();
        }
    };

    const getSnapshot = (): readonly T[] => {
        if (cache === null) cache = read();
        return cache;
    };

    return {
        subscribe(listener) {
            listeners.add(listener);

            if (!storageListenerAttached && hasWindow()) {
                window.addEventListener("storage", onStorage);
                storageListenerAttached = true;
            }

            return () => {
                listeners.delete(listener);
            };
        },

        getSnapshot,

        getServerSnapshot: () => EMPTY,

        get(id) {
            return getSnapshot().find((item) => item.id === id);
        },

        upsert(item) {
            const items = getSnapshot();
            const index = items.findIndex((existing) => existing.id === item.id);
            const next = items.slice();

            if (index >= 0) {
                next[index] = item;
            } else {
                next.push(item);
            }

            commit(next);
            return item;
        },

        upsertMany(newItems) {
            if (newItems.length === 0) return;
            const byId = new Map(getSnapshot().map((item) => [item.id, item]));
            newItems.forEach((item) => byId.set(item.id, item));
            commit(Array.from(byId.values()));
        },

        update(id, updater) {
            const current = getSnapshot().find((item) => item.id === id);
            if (!current) return undefined;
            const updated = updater(current);
            commit(getSnapshot().map((item) => (item.id === id ? updated : item)));
            return updated;
        },

        remove(id) {
            const items = getSnapshot();
            const next = items.filter((item) => item.id !== id);
            if (next.length !== items.length) commit(next);
        },

        removeWhere(predicate) {
            const items = getSnapshot();
            const next = items.filter((item) => !predicate(item));
            const removed = items.length - next.length;
            if (removed > 0) commit(next);
            return removed;
        },

        mapAll(mapper) {
            const items = getSnapshot();
            let changed = false;
            const next = items.map((item) => {
                const mapped = mapper(item);
                if (mapped !== item) changed = true;
                return mapped;
            });
            if (changed) commit(next);
        },
    };
}
