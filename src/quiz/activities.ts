import type { ActivityId } from "./types";

export type AnswerFeedbackCopy = { correct: string; incorrect: string; retry: string };

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
    answerFeedback?: AnswerFeedbackCopy;
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
    /** One short, replayable in-game introduction; detailed reference remains optional. */
    quickInstruction: string;
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
        quickInstruction: "Choose the rod by the water. Press F / Space or CAST, then answer to catch a fish.",
        label: "Fishing",
        icon: "🎣",
        location: "Beach",
        tagline: "Cast your line and answer to reel in fish.",
        available: true,
        copy: {
            startLabel: "Play",
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
                ["Equipment slot", "Choose a tool or empty hands"],
                ["1–4 or A–D", "Choose an answer"],
                ["T / F", "True or false"],
                ["Enter", "Submit a short answer"],
                ["Q", "Quest board (in the village)"],
            ],
        },
    },
    {
        id: "catching_bugs",
        quickInstruction: "Choose the net and approach a cricket. Press F / Space or CATCH, then answer. Practice allows retries.",
        label: "Catching Bugs",
        icon: "🦗",
        location: "Farm",
        tagline: "Approach a cricket in the field, swing the net, then answer to catch it.",
        available: true,
        copy: {
            startLabel: "Play",
            actionLabel: "CATCH",
            waitingActionLabel: "CATCH",
            questionCue: "🦗 CRICKET IN REACH!",
            shortAnswerHint: "PRESS ENTER TO ANSWER",
            playAgainLabel: "CATCH AGAIN",
            scoreIcon: "🦗",
            scoreLabel: "caught",
            answerFeedback: { correct: "✔ CRICKET CAUGHT!", incorrect: "✘ THE CRICKET GOT AWAY…", retry: "Practice: cricket escaped, miss +1. Approach and catch it again to retry the same question." },
            status: {
                netting: "Swinging the net…",
                catching: "Cricket caught!",
                escaped: "Cricket escaped…",
                "round-transition": "Getting ready for the next round…",
            },
        },
        guide: {
            goal: "One cricket = one question, from any subject. Complete every question in the field, without barn lives.",
            steps: [
                "Enter the fenced field. Crickets are randomly scattered, animate in place and are marked ? — not question numbers.",
                "Choose the net from the equipment slot. Approach a cricket: white corners = candidate, yellow = in reach. Press F / Space or CATCH.",
                "That cricket's question appears. Read the feedback first; capture or escape plays only after the question card closes.",
                "Practice: wrong = miss +1. The cricket moves briefly then stops, without disappearing. Catch it again to retry the same question; only the final answer is scored.",
                "Assessment: one attempt per question. A wrong answer makes the cricket move and fade away; miss +1 and that question is completed.",
                "Cricket count follows the quiz, with up to 5 active each round. The last round uses the remaining questions; the farm size does not change.",
                "No barn HP, time penalties or automatic escapes. Switch tools while free, not during actions or open panels.",
            ],
            controls: [
                ["Arrow keys / D-pad", "Walk towards a cricket"],
                ["F / Space / action button", "Use equipped tool (net: nearest cricket)"],
                ["Equipment slot", "Choose a tool or empty hands"],
                ["1–6 or A–F", "Choose an answer"],
                ["T / F", "True / false"],
                ["Enter", "Submit a short answer"],
                ["Q", "Quest board (in the village)"],
            ],
        },
    },
    {
        quickInstruction: "Stand on F by the altar with the flute. Press F / Space or PLAY, then answer to invite a frog.",
        id: "forest_serenade", label: "Forest Serenade", icon: "🪈", location: "Deep Forest",
        tagline: "One frog per question waits near the altar hill. Play your flute to gather them around it.", available: true,
        copy: {
            startLabel: "Play", actionLabel: "PLAY", waitingActionLabel: "PLAY",
            questionCue: "A MELODY FOR THE FOREST", playAgainLabel: "PLAY ANOTHER MELODY",
            scoreIcon: "", scoreLabel: "frogs befriended",
            answerFeedback: { correct: "✔ LOVELY MELODY!", incorrect: "✘ THAT NOTE WAS OFF…", retry: "Practice: miss +1. Play again to retry this question with the same frog." },
            status: { tuning: "Preparing your melody…", serenading: "Playing the flute…", finale: "A short song for the forest…" },
        },
        guide: {
            goal: "Finish every question to complete the serenade. Correct answers bring their frogs around the altar hill; the closing song plays at any score.",
            steps: [
                "Frogs wait nearby, scattered and numbered in question order, one for every question.",
                "Choose the flute. Walk up the small stairs and stand in the marked clearing in front of the altar.",
                "Press F / Space or PLAY. Your character keeps playing the flute while you read and answer, with little musical notes.",
                "Read and answer at your own pace. The feedback closes before your frog starts moving.",
                "Correct: your question's frog joins the circle around the altar hill and puffs with musical notes. Wrong: a sour melody; that frog stays put.",
                "Practice lets you retry the same question. Assessment records each answer once, including wrong answers.",
                "Finish all questions, then enjoy a short closing song before your results. Frog count never blocks completion or changes your academic score.",
            ],
            controls: [
                ["Arrow keys", "Walk"], ["F or Space", "Play the equipped flute in the clearing"],
                ["Equipment slot", "Choose a tool or empty hands"], ["1–6 or A–F", "Choose an answer"],
                ["T / F", "True or false"], ["Enter", "Submit a short answer"],
            ],
        },
    },
];

export function getActivity(id: ActivityId): ActivityDefinition {
    return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
