import type { ActivityId } from "./types";

/** Short UI copy an activity uses for its own buttons, labels and status lines. */
export type ActivityCopy = {
    /** Quest board button for a quest that was never played. */
    startLabel: string;
    /** Main action button while the player is free (e.g. "🎣 CAST"). */
    actionLabel: string;
    /** Main action button while the activity waits for the player. */
    waitingActionLabel: string;
    /** Heading of the question card. */
    questionCue: string;
    /** Optional activity-specific hint for a typed answer. */
    shortAnswerHint?: string;
    /** Results-screen button to play the quest again. */
    playAgainLabel: string;
    /** Score line icon and label in the HUD, e.g. "🐟 2/5 caught". */
    scoreIcon: string;
    scoreLabel: string;
    /** Status line per activity phase (phase names come from the activity). */
    status: Record<string, string>;
};

/** How to play an activity, shown to students and in the quiz editor. */
export type ActivityGuide = {
    goal: string;
    steps: string[];
    /** Key → what it does, e.g. ["Arrow keys", "Walk"]. */
    controls: Array<[string, string]>;
};

export type ActivityDefinition = {
    id: ActivityId;
    label: string;
    icon: string;
    /** Where in the world the activity happens (display only). */
    location: string;
    tagline: string;
    available: boolean;
    copy: ActivityCopy;
    guide: ActivityGuide;
};

/**
 * The registry of playable activities. Each activity brings its own copy and
 * instructions; shared screens (quest board, HUD, quiz editor) read them from
 * here, so only the activity's map and copy know about its theme.
 * (Which map hosts an activity is decided by the game, see
 * `src/game/activities/activity-registry.ts`.)
 */
export const ACTIVITIES: ActivityDefinition[] = [
    {
        id: "fishing",
        label: "Fishing",
        icon: "🎣",
        location: "Beach",
        tagline: "Cast your line and answer to reel in fish.",
        available: true,
        copy: {
            startLabel: "GO FISH ▶",
            actionLabel: "🎣 CAST",
            waitingActionLabel: "↩ REEL IN",
            questionCue: "🐟 FISH ON THE LINE!",
            playAgainLabel: "🎣 FISH AGAIN",
            scoreIcon: "🐟",
            scoreLabel: "caught",
            status: {
                casting: "Casting…",
                waiting: "Waiting for a bite…",
                bite: "Something's biting!",
                reeling: "Reeling in…",
            },
        },
        guide: {
            goal: "Answer each question correctly to catch a fish. Finish all questions to end the quest.",
            steps: [
                "Select the rod in the equipment slot, walk to the water's edge and face the water. The marker shows the landing point.",
                "Press F (or Space) to cast your line. The float must land on the water — sand, the pier and boats don't count.",
                "Wait until something bites. Press F to reel in early if you want to cast again.",
                "A question appears: answer it.",
                "Correct → you catch the fish. Wrong → it gets away and the right answer is shown.",
            ],
            controls: [
                ["Arrow keys", "Walk"],
                ["F or Space", "Use equipped tool (rod: cast / reel in)"],
                ["Equipment slot", "Choose axe, rod or net; shovel/wood unavailable"],
                ["1–4 or A–D", "Choose an answer"],
                ["T / F", "True or false"],
                ["Enter", "Submit a short answer"],
                ["Q", "Quest board (in the village)"],
            ],
        },
    },
    {
        id: "catching_bugs",
        label: "Catching Bugs",
        icon: "🦗",
        location: "Farm",
        tagline: "Dekati cricket di ladang, ayunkan net, lalu jawab soal untuk menangkapnya.",
        available: true,
        copy: {
            startLabel: "KE LADANG ▶",
            actionLabel: "TANGKAP",
            waitingActionLabel: "TANGKAP",
            questionCue: "🦗 CRICKET DALAM JANGKAUAN!",
            shortAnswerHint: "TEKAN ENTER UNTUK MENJAWAB",
            playAgainLabel: "TANGKAP LAGI",
            scoreIcon: "🦗",
            scoreLabel: "tertangkap",
            status: {
                netting: "Mengayunkan net…",
                catching: "Cricket tertangkap!",
                escaped: "Cricket lepas…",
                "round-transition": "Bersiap untuk ronde berikutnya…",
            },
        },
        guide: {
            goal: "Satu cricket = satu soal, dari mapel apa pun. Selesaikan semua soal di ladang tanpa sistem nyawa barn.",
            steps: [
                "Masuk ke ladang dalam pagar. Cricket tersebar acak, beranimasi di tempat, dan ditandai ? — bukan nomor soal.",
                "Pilih jaring lewat slot alat di bawah-tengah. Dekati cricket: sudut putih = kandidat, kuning = dalam jangkauan. Tekan F / Spasi atau TANGKAP.",
                "Soal milik cricket itu akan muncul. Baca hasil jawaban dahulu; animasi tangkap atau lepas baru berjalan setelah panel soal tertutup.",
                "Mode latihan: salah = miss +1. Cricket bergerak sebentar lalu berhenti, tidak menghilang. Tangkap lagi untuk mengulang soal yang sama; skor memakai hasil akhirnya.",
                "Mode asesmen: satu percobaan per soal. Jika salah, cricket bergerak dan memudar keluar; miss +1 dan soal tersebut selesai.",
                "Total cricket mengikuti jumlah soal, maksimal 5 aktif per ronde. Ronde terakhir menyesuaikan sisa soal; ukuran farm tidak berubah.",
                "Tidak ada HP barn, penalti waktu atau kabur otomatis. Alat bisa diganti saat bebas, bukan saat aksi atau panel sedang terbuka.",
            ],
            controls: [
                ["Tombol panah / D-pad", "Berjalan mendekati cricket"],
                ["F / Spasi / tombol aksi", "Gunakan alat aktif (jaring: cricket terdekat)"],
                ["Slot alat", "Pilih kapak, pancing atau jaring"],
                ["1–6 atau A–F", "Pilih jawaban"],
                ["T / F", "Benar / salah"],
                ["Enter", "Kirim jawaban singkat"],
                ["Q", "Quest board (di desa)"],
            ],
        },
    },
];

export function getActivity(id: ActivityId): ActivityDefinition {
    return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
