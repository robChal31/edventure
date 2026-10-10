import type { Quiz } from "./types";

const ROOMS_KEY = "learning-world.rooms.v1";
const ACTIVE_ROOM_KEY = "learning-world.active-room.v1";

/**
 * Minimal prototype persistence using browser localStorage. No backend.
 * Also exposes a tiny subscription store so React components can read
 * rooms reactively (SSR-safe).
 */

const listeners = new Set<() => void>();
let cache: Quiz[] | null = null;

function readRooms(): Quiz[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(ROOMS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Quiz[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (r) => r && typeof r.name === "string" && Array.isArray(r.questions)
        );
    } catch {
        return [];
    }
}

export function loadRooms(): Quiz[] {
    if (cache === null) cache = readRooms();
    return cache;
}

function notify(): void {
    cache = null;
    listeners.forEach((l) => l());
}

export function subscribeRooms(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getRoomsSnapshot(): Quiz[] {
    return loadRooms();
}

function persist(rooms: Quiz[]): void {
    try {
        window.localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    } catch {
        // storage unavailable — prototype still works in-memory
    }
}

export function saveRoom(quiz: Quiz): Quiz[] {
    const rooms = loadRooms().slice();
    const existingIndex = rooms.findIndex((r) => r.id === quiz.id);
    if (existingIndex >= 0) {
        rooms[existingIndex] = quiz;
    } else {
        rooms.push(quiz);
    }
    if (typeof window !== "undefined") persist(rooms);
    notify();
    return rooms;
}

export function deleteRoom(id: string): Quiz[] {
    const rooms = loadRooms().filter((r) => r.id !== id);
    if (typeof window !== "undefined") persist(rooms);
    notify();
    return rooms;
}

export function setActiveRoom(id: string): void {
    try {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(ACTIVE_ROOM_KEY, id);
        }
    } catch {
        // ignore
    }
}

export function loadActiveRoom(): Quiz | null {
    try {
        if (typeof window === "undefined") return null;
        const id = window.localStorage.getItem(ACTIVE_ROOM_KEY);
        if (!id) return null;
        return loadRooms().find((r) => r.id === id) ?? null;
    } catch {
        return null;
    }
}
