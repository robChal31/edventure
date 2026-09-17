"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let game: import("phaser").Game | undefined;

    async function initGame() {
        const { createGame } = await import("./game");
        if (!gameRef.current) return;

        game = createGame(gameRef.current);
    }

    initGame();

    return () => {
        game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}