"use client";

import { useEffect, useRef } from "react";
import type { ActivityController, GameOptions } from "./game-options";

type PhaserGameProps = {
    options?: GameOptions;
    onReady?: (controller: ActivityController) => void;
};

/**
 * React <-> Phaser integration. Mounts the game once; the parent passes
 * the active quiz + an event sink and receives an imperative controller.
 */
export default function PhaserGame({ options, onReady }: PhaserGameProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const propsRef = useRef({ options, onReady });

    // Keep latest props for the async boot without re-mounting the game.
    useEffect(() => {
        propsRef.current = { options, onReady };
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let handle: import("./game").GameHandle | undefined;
        let cancelled = false;

        (async () => {
            const { createGame } = await import("./game");
            if (cancelled || !container) return;
            handle = createGame(container, propsRef.current.options);
            propsRef.current.onReady?.(handle.controller);
        })();

        return () => {
            cancelled = true;
            handle?.destroy();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
        />
    );
}
