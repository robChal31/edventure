import { DEFAULT_LOCALE, type Locale } from "./locale";
import { MESSAGE_PAIRS } from "./messages";
export type MessageValues = Record<string, string | number>;
const dictionary = new Map<string, readonly [string, string]>();
const templates: { expression: RegExp; names: string[]; pair: readonly [string, string] }[] = [];
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Only these legacy Phaser prompts arrive already interpolated. Other UI messages
// must pass explicit values. Never use broad templates to reinterpret unknown text.
const RAW_PROMPTS = new Set([
    "Round {round}/{rounds} · {count} crickets. Find ? and use the net!",
    "Question {number} of {total} — face the water and press F (or Space / CAST).",
    "Bonk! The bait hit {obstacle}. Try another spot.",
    "Write between {min} and {max} options.",
]);
// One already-interpolated prompt also existed in mixed-language builds. Keep that exact
// system-only alias working while all new activities emit canonical English message keys.
const RAW_PROMPT_ALIASES: Readonly<Record<string, readonly string[]>> = {
    "Round {round}/{rounds} · {count} crickets. Find ? and use the net!": ["Ronde {round}/{rounds} · {count} cricket. Cari tanda ? dan pakai jaring!"],
};
for (const pair of MESSAGE_PAIRS) {
    dictionary.set(pair[0], pair); dictionary.set(pair[1], pair);
    if (!RAW_PROMPTS.has(pair[0])) continue;
    for (const source of new Set([...pair, ...(RAW_PROMPT_ALIASES[pair[0]] ?? [])])) {
        const names: string[] = [];
        let pattern = ""; let offset = 0;
        for (const match of source.matchAll(/\{(\w+)\}/g)) {
            pattern += escapeRegex(source.slice(offset, match.index)) + (match[1] === "obstacle" ? "(.+?)" : "(\\d+)");
            names.push(match[1]); offset = match.index! + match[0].length;
        }
        templates.push({ expression: new RegExp(`^${pattern}${escapeRegex(source.slice(offset))}$`, "u"), names, pair });
    }
}
export function hasTranslation(message: string): boolean { return dictionary.has(message); }
export function translate(locale: Locale = DEFAULT_LOCALE, message: string, values?: MessageValues): string {
    let pair = dictionary.get(message);
    let resolved = values;
    if (!pair && !values) {
        for (const template of templates) {
            const match = template.expression.exec(message);
            if (!match) continue;
            pair = template.pair; resolved = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]])); break;
        }
    }
    if (pair?.[0] === "Bonk! The bait hit {obstacle}. Try another spot." && resolved?.obstacle) {
        resolved = { ...resolved, obstacle: translate(locale, String(resolved.obstacle)) };
    }
    const text = pair ? pair[locale === "en" ? 0 : 1] : message;
    return text.replace(/\{(\w+)\}/g, (original, name: string) => String(resolved?.[name] ?? original));
}
