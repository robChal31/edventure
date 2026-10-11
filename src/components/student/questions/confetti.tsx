const COLORS = ["#facc15", "#4ade80", "#38bdf8", "#f472b6", "#fb923c", "#a78bfa"];

/** Deterministic pseudo-random in [0, 1) so rendering stays pure. */
function noise(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

/** A one-shot burst of pixel confetti (CSS only). */
export default function Confetti({ pieces = 28 }: { pieces?: number }) {
    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible" aria-hidden>
            {Array.from({ length: pieces }).map((_, i) => {
                const style = {
                    left: `${4 + noise(i + 1) * 92}%`,
                    background: COLORS[i % COLORS.length],
                    animationDelay: `${noise(i + 7) * 0.25}s`,
                    "--lw-dx": `${(noise(i + 3) - 0.5) * 160}px`,
                    "--lw-rot": `${(noise(i + 5) - 0.5) * 900}deg`,
                } as React.CSSProperties;

                return <span key={i} className="lw-confetti-piece" style={style} />;
            })}
        </div>
    );
}
