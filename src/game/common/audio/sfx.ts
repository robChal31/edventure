/**
 * A tiny WebAudio synthesizer for short gameplay sound effects.
 * Falls back silently if the AudioContext is unavailable (e.g. before
 * the first user gesture or in a non-audio environment).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    try {
        if (typeof window === "undefined") return null;
        const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (!Ctor) return null;
        if (!ctx) ctx = new Ctor();
        if (ctx.state === "suspended") {
            void ctx.resume();
        }
        return ctx;
    } catch {
        return null;
    }
}

function tone(
    freqFrom: number,
    freqTo: number,
    duration: number,
    type: OscillatorType,
    gain = 0.06,
    when = 0
): void {
    const audio = getCtx();
    if (!audio) return;
    try {
        const t0 = audio.currentTime + when;
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqFrom, t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(g).connect(audio.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
    } catch {
        // ignore audio failures
    }
}

function noise(duration: number, gain = 0.05, when = 0): void {
    const audio = getCtx();
    if (!audio) return;
    try {
        const t0 = audio.currentTime + when;
        const frames = Math.floor(audio.sampleRate * duration);
        const buffer = audio.createBuffer(1, frames, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
        }
        const src = audio.createBufferSource();
        src.buffer = buffer;
        const g = audio.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        src.connect(g).connect(audio.destination);
        src.start(t0);
    } catch {
        // ignore
    }
}

export const sfx = {
    cast(): void {
        tone(500, 180, 0.18, "sine", 0.05);
        noise(0.12, 0.03, 0.05);
    },
    splash(): void {
        noise(0.25, 0.06);
        tone(300, 90, 0.2, "sine", 0.04);
    },
    bite(): void {
        tone(700, 900, 0.08, "square", 0.05);
        tone(900, 1200, 0.08, "square", 0.05, 0.09);
    },
    correct(): void {
        tone(523, 523, 0.1, "triangle", 0.06);
        tone(659, 659, 0.1, "triangle", 0.06, 0.1);
        tone(784, 784, 0.16, "triangle", 0.07, 0.2);
    },
    wrong(): void {
        tone(220, 160, 0.16, "sawtooth", 0.05);
        tone(160, 110, 0.22, "sawtooth", 0.05, 0.14);
    },
    escape(): void {
        noise(0.2, 0.05);
        tone(400, 120, 0.25, "sine", 0.04, 0.05);
    },
    complete(): void {
        const notes = [523, 659, 784, 1046];
        notes.forEach((n, i) => tone(n, n, 0.14, "triangle", 0.07, i * 0.12));
    },
};
