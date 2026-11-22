import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ACTIVITIES, getActivity } from "../src/quiz/activities";
import { activityDialoguePages, activityReferencePages, dialogueGraphemes, DIALOGUE_HEADINGS, DIALOGUE_SPEAKERS, DIALOGUE_UI_MESSAGES, WORLD_HELP_TIPS } from "../src/quiz/activity-dialogue";
import { ActivityGuideDetails, ActivityGuideDialog } from "../src/components/ui/activity-guide";
import GameHelp from "../src/components/student/game-help";
import { hasTranslation, translate } from "../src/i18n/translate";

for (const activity of ACTIVITIES) {
    test(`activity dialogue: ${activity.id} opens one brief message and preserves every detailed rule on demand`, () => {
        const before = JSON.stringify(activity);
        const quick = activityDialoguePages(activity);
        assert.deepEqual(quick, [{ id: "quick", kind: "quick", text: activity.quickInstruction }]);
        for (const locale of ["en", "id"] as const) {
            const text = translate(locale, activity.quickInstruction);
            assert.ok(text.split(/\s+/).length <= 30, `${locale}: ${text}`);
            assert.ok(hasTranslation(activity.quickInstruction));
        }
        const pages = activityReferencePages(activity);
        assert.deepEqual(pages[0], { id: "goal", kind: "goal", text: activity.guide.goal });
        assert.deepEqual(pages.filter(page => page.kind === "step").map(page => [page.step, page.text]), activity.guide.steps.map((text, index) => [index + 1, text]));
        const controls = pages.filter(page => page.kind === "controls");
        assert.deepEqual(controls.flatMap(page => page.controls), activity.guide.controls);
        assert.ok(controls.every(page => page.controls.length > 0 && page.controls.length <= 3));
        assert.equal(pages.length, 1 + activity.guide.steps.length + Math.ceil(activity.guide.controls.length / 3));
        assert.equal(new Set(pages.map(page => page.id)).size, pages.length);
        assert.equal(pages.some(page => page.kind === "tip"), false);
        assert.equal(JSON.stringify(activity), before);
    });
}

test("activity dialogue: optional Help details retain both world tips without lengthening the quick replay", () => {
    for (const activity of ACTIVITIES) {
        const start = activityReferencePages(activity);
        const help = activityReferencePages(activity, true);
        assert.equal(activityDialoguePages(activity).length, 1);
        assert.deepEqual(help.slice(0, start.length), start);
        assert.deepEqual(help.slice(start.length).map(page => page.kind === "tip" ? page.text : null), WORLD_HELP_TIPS);
        assert.equal(new Set(help.map(page => page.id)).size, help.length);
    }
});

test("activity dialogue: variable guide lengths do not drop controls or produce empty pages", () => {
    for (const count of [0, 1, 2, 3, 4, 7, 19]) {
        const controls: Array<[string, string]> = Array.from({ length: count }, (_, index) => [`Key ${index}`, `Action ${index}`]);
        const pages = activityReferencePages({ ...getActivity("fishing"), guide: { goal: "Goal", steps: [], controls } });
        assert.equal(pages.length, 1 + Math.ceil(count / 3));
        assert.deepEqual(pages.flatMap(page => page.kind === "controls" ? page.controls : []), controls);
    }
});

test("activity dialogue: all original NPC portraits are 4×2 native 64px frames and the RPG frame exists", () => {
    for (const speaker of Object.values(DIALOGUE_SPEAKERS)) {
        assert.ok(speaker.portrait.startsWith("/assets/images/farm asset pack/Character/NPC'S/"));
        const png = readFileSync(`public${speaker.portrait}`);
        assert.equal(png.readUInt32BE(16), 64 * 4);
        assert.equal(png.readUInt32BE(20), 64 * 2);
        assert.ok(speaker.name.length > 0);
    }
    const frame = readFileSync("public/assets/images/ui/dialog_ui.png");
    assert.equal(frame.readUInt32BE(16), 192); assert.equal(frame.readUInt32BE(20), 74);
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(css, /\.activity-dialogue-portrait-art\s*\{[^}]*background-size: 400% 200%;[^}]*background-position: 0 0;/);
    assert.match(css, /border-image: url\("\/assets\/images\/ui\/dialog_ui\.png"\)/);
});

test("activity dialogue: typing never splits accents, Indonesian flags, emoji families or surrogate pairs", () => {
    assert.deepEqual(dialogueGraphemes(""), []);
    assert.deepEqual(dialogueGraphemes("Baca!"), ["B", "a", "c", "a", "!"]);
    const text = "Ame\u0301🇮🇩👨‍👩‍👧‍👦🪈👍🏽";
    const segments = dialogueGraphemes(text);
    assert.deepEqual(segments, ["A", "m", "e\u0301", "🇮🇩", "👨‍👩‍👧‍👦", "🪈", "👍🏽"]);
    assert.equal(segments.join(""), text);
});

test("activity dialogue: navigation, dynamic headings, speaker roles and preserved Help tips translate both ways", () => {
    for (const message of [...DIALOGUE_UI_MESSAGES, ...Object.values(DIALOGUE_HEADINGS), ...Object.values(DIALOGUE_SPEAKERS).map(speaker => speaker.role), ...WORLD_HELP_TIPS]) {
        assert.ok(hasTranslation(message), message);
        assert.equal(translate("en", translate("id", message)), message);
    }
    assert.equal(translate("id", "Step {value0}", { value0: 7 }), "Langkah 7");
    assert.equal(translate("id", "Dialogue page {current} of {total}", { current: 2, total: 11 }), "Halaman panduan 2 dari 11");
});

test("activity dialogue: all three entry guides render one native dialogue and a cropped original portrait", () => {
    for (const activity of ACTIVITIES) {
        const props = { activity, open: true, onClose: () => {} };
        const html = renderToStaticMarkup(createElement(ActivityGuideDialog, props));
        assert.equal((html.match(/<dialog\b/g) ?? []).length, 1);
        assert.ok(html.includes('aria-modal="true"'));
        assert.ok(html.includes('aria-describedby="'));
        assert.ok(html.includes('role="status" aria-live="polite" aria-atomic="true"'));
        assert.ok(html.includes('class="activity-dialogue-portrait-art"'));
        assert.ok(html.includes(DIALOGUE_SPEAKERS[activity.id].name));
        assert.ok(html.includes(translate("id", "Skip guide")));
        assert.ok(html.includes(translate("id", "Details")));
        assert.ok(html.includes(translate("id", "Guide available any time.")));
        assert.equal(html.includes('class="activity-dialogue-counter'), false);
        assert.equal(html.includes('class="activity-dialogue-button" disabled=""'), false);
        assert.equal(renderToStaticMarkup(createElement(ActivityGuideDialog, { ...props, open: false })), "");
        assert.ok(renderToStaticMarkup(createElement(GameHelp, props)).includes("<dialog"));
    }
});

test("activity dialogue: teacher/quest-card references stay complete and village Help remains an ordinary modal", () => {
    for (const activity of ACTIVITIES) {
        const html = renderToStaticMarkup(createElement(ActivityGuideDetails, { activity }));
        assert.ok(html.startsWith("<details")); assert.equal(html.includes("<dialog"), false);
        assert.equal((html.match(/<li\b/g) ?? []).length, activity.guide.steps.length);
        assert.equal((html.match(/<kbd\b/g) ?? []).length, activity.guide.controls.length);
    }
    const village = renderToStaticMarkup(createElement(GameHelp, { open: true, onClose: () => {} }));
    assert.ok(village.includes('role="dialog"'));
    assert.equal(village.includes("activity-dialogue"), false);
    assert.ok(village.includes(translate("id", "Continue")));
});
