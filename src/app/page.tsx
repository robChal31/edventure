import PhaserGame from "../game/PhaserGame";

export default function Home() {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <PhaserGame />
    </main>
  );
}