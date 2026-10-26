import Phaser from "phaser";
import type { AnswerValue, PlayableQuiz } from "@/quiz/types";
import type { PreparedAction } from "../equipment/targeting";
import type { GameEvent } from "../game-options";
import type { Player } from "../game-objects/player/player";
import type { WorldMap } from "../world/world-map";

/** A map object an activity may need to know about (props, animated sprites). */
export type MapObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

export type ActivityContext = {
    scene: Phaser.Scene;
    player: Player;
    worldMap: WorldMap;
    /** Everything placed on the map: static props + animated sprites. */
    mapObjects: readonly MapObject[];
    quiz: PlayableQuiz;
    emit: (event: GameEvent) => void;
};

/**
 * A quiz activity running inside the GameScene. The scene forwards input
 * and lifecycle; the activity owns its gameplay and its QuizSession.
 */
export interface Activity {
    create(): void;
    /** The activity key was pressed (F / Space) or the touch button tapped. */
    handlePrimaryAction(): void;
    /** Preview and execution share the exact resolved target snapshot. */
    preparePrimaryAction?(): PreparedAction;
    /** React confirms that the closing question DOM has actually unmounted. */
    questionClosed?(requestId: number): void;
    answer(answer: AnswerValue): void;
    /** Replay the quiz from the first question. */
    restart(): void;
    update(time: number, delta: number): void;
    destroy(): void;
}
