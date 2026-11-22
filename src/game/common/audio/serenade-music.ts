/** An original 3.6-second C-major closing phrase, not a looping/external soundtrack. */
export type SerenadeNote = { at: number; frequency: number; duration: number; gain: number; type: OscillatorType };
export const SERENADE_FINALE_DURATION_MS = 3800;

const melody = [
    [0, 523.25, 0.24], [0.27, 587.33, 0.24], [0.54, 659.25, 0.24], [0.81, 783.99, 0.45],
    [1.35, 659.25, 0.24], [1.62, 783.99, 0.24], [1.89, 1046.5, 0.48],
    [2.43, 783.99, 0.24], [2.7, 659.25, 0.24], [2.97, 523.25, 0.63],
] as const;
export const SERENADE_FINALE_NOTES: readonly SerenadeNote[] = [
    ...melody.flatMap(([at, frequency, duration]) => [
        { at, frequency, duration, gain: 0.052, type: "sine" as const },
        { at, frequency: frequency * 2, duration: duration * 0.85, gain: 0.006, type: "sine" as const },
    ]),
    ...[[0, 130.81], [0, 196], [0, 329.63], [1.35, 174.61], [1.35, 261.63], [1.35, 349.23],
        [2.7, 130.81], [2.7, 196], [2.7, 329.63]].map(([at, frequency]) => ({ at, frequency, duration: at === 2.7 ? 0.9 : 1.1, gain: 0.008, type: "triangle" as const })),
];

/** Audio is optional. Cancellation is idempotent and owns every scheduled voice. */
export function playSerenadeFinale(audio: AudioContext | null): () => void {
    if (!audio || audio.state === "closed") return () => {};
    const voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
    const cancel = () => {
        voices.forEach(({ oscillator, gain }) => {
            oscillator.onended = null;
            try { oscillator.stop(); } catch { /* Already ended. */ }
            oscillator.disconnect(); gain.disconnect();
        });
        voices.clear();
    };
    try {
        const start = audio.currentTime + 0.025;
        SERENADE_FINALE_NOTES.forEach((note) => {
            const oscillator = audio.createOscillator(), gain = audio.createGain(), at = start + note.at;
            const voice = { oscillator, gain }; voices.add(voice);
            oscillator.type = note.type;
            oscillator.frequency.setValueAtTime(note.frequency, at);
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(note.gain, at + 0.035);
            gain.gain.setValueAtTime(note.gain * 0.7, at + note.duration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
            oscillator.connect(gain).connect(audio.destination);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(voice); };
            oscillator.start(at); oscillator.stop(at + note.duration + 0.025);
        });
    } catch { cancel(); }
    return cancel;
}
