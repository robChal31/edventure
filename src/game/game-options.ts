import type { Question, Quiz, QuizSummary } from "@/quiz/types";

/**
 * The coarse state machine phases the fishing activity moves through.
 * The React HUD/overlays subscribe to these to drive the question panel
 * and result banners.
 */
export type FishingPhase =
    | "idle"
    | "casting"
    | "waiting"
    | "bite"
    | "answering"
    | "catching"
    | "escaped"
    | "complete";

export type GameEvent =
    | { type: "game:ready" }
    | { type: "phase"; phase: FishingPhase }
    | {
          type: "question";
          questionNumber: number;
          total: number;
          question: Question;
      }
    | {
          type: "answer";
          correct: boolean;
          selectedIndex: number;
          correctIndex: number;
          question: Question;
          caught: number;
          answered: number;
          total: number;
          feedback: string;
      }
    | { type: "prompt"; message: string | null }
    | { type: "hud"; caught: number; answered: number; total: number; questionNumber: number }
    | { type: "complete"; summary: QuizSummary };

export type VirtualDirection = "up" | "down" | "left" | "right";

/** Imperative handle the React shell uses to talk to the running game. */
export type ActivityController = {
    cast(): void;
    answer(optionIndex: number): void;
    restart(): void;
    setVirtualDirection(dir: VirtualDirection, pressed: boolean): void;
};

export type GameOptions = {
    quiz: Quiz;
    onEvent: (event: GameEvent) => void;
};
