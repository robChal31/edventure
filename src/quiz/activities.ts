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
                "Walk to the water's edge and face the water.",
                "Press F (or Space) to cast your line. The float must land on the water — sand, the pier and boats don't count.",
                "Wait until something bites. Press F to reel in early if you want to cast again.",
                "A question appears: answer it.",
                "Correct → you catch the fish. Wrong → it gets away and the right answer is shown.",
            ],
            controls: [
                ["Arrow keys", "Walk"],
                ["F or Space", "Cast / reel in"],
                ["1–4 or A–D", "Choose an answer"],
                ["T / F", "True or false"],
                ["Enter", "Submit a short answer"],
                ["Q", "Quest board (in the village)"],
            ],
        },
    },
];

export function getActivity(id: ActivityId): ActivityDefinition {
    return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
