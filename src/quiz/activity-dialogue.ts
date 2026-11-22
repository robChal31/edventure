import type { ActivityDefinition } from "./activities";
import type { ActivityId } from "./types";

export type DialogueSpeaker = { name: string; role: string; portrait: string };
export type DialoguePage = { id: string } & (
    | { kind: "quick" | "goal" | "tip"; text: string }
    | { kind: "step"; text: string; step: number }
    | { kind: "controls"; controls: ReadonlyArray<readonly [string, string]> }
);

const portraits = "/assets/images/farm asset pack/Character/NPC'S";
/** First native 64×64 portrait in each original 4×2 premade expression sheet. */
export const DIALOGUE_SPEAKERS: Record<ActivityId, DialogueSpeaker> = {
    fishing: { name: "Jack", role: "Fishing guide", portrait: `${portraits}/Pirate/Premade/Jack/Pirate Portrait.png` },
    catching_bugs: { name: "Gaston", role: "Farm guide", portrait: `${portraits}/Chef/Premade/Gaston/Chef Portrait.png` },
    forest_serenade: { name: "Elyria", role: "Forest guide", portrait: `${portraits}/Mermaid/Premade/Elyria/Portrait.png` },
};

export const DIALOGUE_HEADINGS = { quick: "Quick guide", goal: "Your quest", step: "Step {value0}", controls: "Controls", tip: "Good to know" } as const;
export const DIALOGUE_UI_MESSAGES = [
    "Your quest", "Step {value0}", "Good to know", "Back", "Next", "Show text", "Skip guide", "Let's go!",
    "Dialogue page {current} of {total}", "Read at your own pace.", "Enter / Space", "Details", "Quick guide", "Guide available any time.",
] as const;
export const WORLD_HELP_TIPS = [
    "Axe: trees take 5 chops, then 3 more to clear the wood. Bushes disappear after 3 chops without leaving a stump. Click dropped logs to collect them, then open Inventory to see your bag.",
    "Progress is saved on this browser, not across devices. Refresh uses your browser's standard confirmation; use Save / exit for more choices.",
] as const;

function controlPages(controls: ReadonlyArray<readonly [string, string]>): DialoguePage[] {
    const pages: DialoguePage[] = [];
    for (let index = 0; index < controls.length; index += 3) {
        pages.push({ id: `controls-${index / 3}`, kind: "controls", controls: controls.slice(index, index + 3) });
    }
    return pages;
}
function worldTips(): DialoguePage[] { return WORLD_HELP_TIPS.map((text, index) => ({ id: `tip-${index}`, kind: "tip", text })); }

/** One brief, skippable message. Full rules and controls are opt-in, never an opening obstacle. */
export function activityDialoguePages(activity: ActivityDefinition): DialoguePage[] {
    return [{ id: "quick", kind: "quick", text: activity.quickInstruction }];
}

/** Detailed reference preserves all rules, ordered steps and controls for the Details button. */
export function activityReferencePages(activity: ActivityDefinition, includeWorldTips = false): DialoguePage[] {
    return [
        { id: "goal", kind: "goal", text: activity.guide.goal },
        ...activity.guide.steps.map((text, index): DialoguePage => ({ id: `step-${index}`, kind: "step", step: index + 1, text })),
        ...controlPages(activity.guide.controls),
        ...(includeWorldTips ? worldTips() : []),
    ];
}

/** Native grapheme boundaries keep accents/emoji together; older browsers still keep surrogate pairs intact. */
export function dialogueGraphemes(text: string): string[] {
    if (typeof Intl.Segmenter !== "undefined") return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), part => part.segment);
    return Array.from(text);
}
