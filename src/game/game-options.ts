import type {
    ActivityId,
    AnswerValue,
    PlayableQuiz,
    Question,
    QuizSummary,
    QuizMode,
} from "@/quiz/types";
import type { MapId } from "./world/maps/map-registry";

import type { EquipmentId, EquipmentState } from "./equipment/equipment";

export type { MapId };

/**
 * The coarse activity state machine phases.
 * The React HUD/overlays subscribe to these to drive the question panel
 * and result banners.
 */
export type FishingPhase =
    | "idle"
    | "casting"
    | "waiting"
    | "bite"
    | "answering"
    | "reeling"
    | "catching"
    | "escaped"
    | "complete";

export type CatchingBugsPhase =
    | "idle"
    | "netting"
    | "closing-question"
    | "answering"
    | "catching"
    | "escaped"
    | "round-transition"
    | "complete";

export type ActivityPhase = FishingPhase | CatchingBugsPhase;

export type ActivityHudState = {
    caught: number;
    answered: number;
    total: number;
    questionNumber: number;
    misses?: number;
    round?: number;
    rounds?: number;
    mode?: QuizMode;
};

export type GameEvent =
    | { type: "game:ready" }
    | ({ type: "equipment" } & EquipmentState)
    | { type: "question:close"; requestId: number }
    /** A map finished loading (first boot or after travelling). */
    | {
          type: "map:loaded";
          mapId: MapId;
          activityId: ActivityId | null;
          quizId: string | null;
      }
    /** The camera started fading out to travel to another map. */
    | { type: "travel:start"; to: MapId }
    | { type: "phase"; phase: ActivityPhase }
    | {
          type: "question";
          questionNumber: number;
          total: number;
          question: Question;
      }
    | {
          type: "answer";
          correct: boolean;
          question: Question;
          answer: AnswerValue;
          /** Display text of the right answer ("Mars", "False", "12 / twelve"). */
          correctAnswer: string;
          caught: number;
          answered: number;
          total: number;
          feedback: string;
          /** Wrong practice catch: the same target/question can be tried again. */
          retryable?: boolean;
      }
    | { type: "prompt"; message: string | null }
    | ({ type: "hud" } & ActivityHudState)
    | { type: "complete"; summary: QuizSummary };

export type VirtualDirection = "up" | "down" | "left" | "right";

/** Imperative handle the React shell uses to talk to the running game. */
export type ActivityController = {
    /** Travel to the map that hosts the quiz's activity and start it. */
    startQuiz(quiz: PlayableQuiz): void;
    /** Travel back to the village hub. */
    returnToHub(): void;
    /** One action for keyboard, touch and the current equipment. */
    primaryAction(): void;
    equip(equipment: EquipmentId): void;
    setEquipmentPickerOpen(open: boolean): void;
    questionClosed(requestId: number): void;
    answer(answer: AnswerValue): void;
    /** Replay the current quiz from question 1 on the same map. */
    restart(): void;
    setVirtualDirection(dir: VirtualDirection, pressed: boolean): void;
    /**
     * Turn game keyboard handling off while an HTML overlay needs the keys
     * (Phaser otherwise swallows F / Space when typing). Also clears touch input.
     */
    setKeyboardEnabled(enabled: boolean): void;
};

export type GameOptions = {
    /** Map to open on boot. Defaults to the village hub. */
    initialMap?: MapId;
    /** Display only; never used as a quiz/student identifier. */
    playerName?: string;
    /** Start straight into an activity (e.g. teacher preview). */
    initialQuiz?: PlayableQuiz;
    onEvent: (event: GameEvent) => void;
};
