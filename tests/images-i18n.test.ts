import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { sanitizeQuestionImage, MAX_IMAGE_DATA_URL_LENGTH } from "../src/quiz/question-image";
import { QUESTION_TYPES, draftFromQuestion, emptyDraft, questionFromDraft, sanitizeQuestion, validateDraft } from "../src/quiz/question-types";
import { translate, hasTranslation } from "../src/i18n/translate";
import { isLocale } from "../src/i18n/locale";
import { ACTIVITIES } from "../src/quiz/activities";
import { sanitizeCheckpoint } from "../src/lms/repositories/checkpoint-repository";
import { attemptsToCsv } from "../src/lms/services/csv";

const image = { src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTAAAAABJRU5ErkJggg==", alt: "A plant with two leaves", width: 1, height: 1 };

test("question images: image-only and mixed prompts survive editor, storage and student snapshots", () => {
    const draft = { ...emptyDraft("true_false"), image, grade: 4, subject: "Science", topic: "Plants", curriculum: "merdeka" as const };
    assert.deepEqual(validateDraft(draft), []);
    const question = questionFromDraft(draft, "image-only", "2026-10-23");
    assert.equal(question.text, ""); assert.deepEqual(question.image, image);
    const loaded = sanitizeQuestion(JSON.parse(JSON.stringify(question)))!;
    assert.deepEqual(loaded.image, image); assert.deepEqual(draftFromQuestion(loaded).image, image);
    assert.deepEqual(questionFromDraft({ ...draftFromQuestion(loaded), type: "short_answer", acceptedAnswers: ["leaf"] }, "copy", "2026-10-23").image, image);
    assert.deepEqual(questionFromDraft({ ...draft, text: "Look at the plant." }, "mixed", "2026-10-23").image, image);
    assert.ok(validateDraft({ ...draft, image: { ...image, alt: " " } }).some((error) => error.includes("accessibility")));
});

test("question images: only bounded, actual raster data is accepted, never remote/SVG/script content", () => {
    assert.deepEqual(sanitizeQuestionImage(image), image);
    for (const invalid of [null, { ...image, src: "https://tracker.example/image.png" }, { ...image, src: "javascript:alert(1)" },
        { ...image, src: "data:image/svg+xml;base64,PHN2Zy8+" }, { ...image, src: "data:image/png;base64,PHN2Zy8+" },
        { ...image, width: 0 }, { ...image, height: 1601 }, { ...image, width: NaN }, { ...image, height: 1.5 },
        { ...image, src: "data:image/png;base64," + "a".repeat(MAX_IMAGE_DATA_URL_LENGTH) }]) assert.equal(sanitizeQuestionImage(invalid), undefined);
    assert.equal(sanitizeQuestionImage({ ...image, alt: "a".repeat(600) })?.alt.length, 500);
});

test("question images: a corrupted saved image invalidates the checkpoint rather than losing an image-only question", () => {
    const question = questionFromDraft({ ...emptyDraft("true_false"), image }, "image", "2026-10-23");
    const checkpoint = { version: 1, studentId: "ani", runId: "run", startedAt: "2026-10-23T00:00:00Z", savedAt: "2026-10-23T00:00:01Z",
        quiz: { id: "image-quiz", name: "Pictures", activityId: "fishing", questions: [question] }, progress: { quiz: { version: 1, answers: [] } } };
    assert.ok(sanitizeCheckpoint(checkpoint));
    assert.equal(sanitizeCheckpoint({ ...checkpoint, quiz: { ...checkpoint.quiz, questions: [{ ...question, image: { ...image, src: "bad" } }] } }), null);
});

test("i18n: Indonesian and English UI, interpolation and legacy native game prompts work in both directions", () => {
    assert.ok(isLocale("id")); assert.ok(isLocale("en")); assert.equal(isLocale("fr"), false);
    assert.equal(translate("id", "Empty hands"), "Tangan kosong");
    assert.equal(translate("en", "Tangan kosong"), "Empty hands");
    assert.equal(translate("id", "Completed {answered}/{total}", { answered: 3, total: 4 }), "Selesai 3/4");
    assert.equal(translate("id", "Bonk! The bait hit the boat. Try another spot."), "Duk! Umpan mengenai perahu. Coba tempat lain.");
    assert.equal(translate("en", "Ronde 1/2 · 5 cricket. Cari tanda ? dan pakai jaring!"), "Round 1/2 · 5 crickets. Find ? and use the net!");
    assert.equal(translate("id", "Question 1 of 7 — face the water and press F (or Space / CAST)."), "Soal 1 dari 7 — hadap ke air lalu tekan F (atau Spasi / LEMPAR).");
});

test("i18n: unknown/teacher content is never reinterpreted by count templates", () => {
    const custom = "No one has played yet. Share the student codes in my own way.";
    assert.equal(translate("id", custom), custom);
    assert.equal(translate("en", "Nama kuis buatan Ibu Ani"), "Nama kuis buatan Ibu Ani");
});

test("i18n: every static translated UI message and activity instruction has an Indonesian/English pair", () => {
    const walk = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${path}/${entry.name}`) : entry.name.endsWith(".tsx") ? [`${path}/${entry.name}`] : []);
    const missing = new Set<string>();
    for (const path of [...walk("src/components"), "src/app/page.tsx"]) {
        const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
                const message = node.arguments[0].text;
                if (/[A-Za-zÀ-ž]{2}/.test(message.replace(/\{\w+\}/g, "")) && !hasTranslation(message)) missing.add(message);
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    for (const info of Object.values(QUESTION_TYPES)) {
        for (const message of [info.label, info.shortLabel, info.description]) if (!hasTranslation(message)) missing.add(message);
    }
    for (const activity of ACTIVITIES) {
        for (const message of [activity.label, activity.location, activity.tagline, activity.guide.goal, ...activity.guide.steps, ...activity.guide.controls.flat(), ...Object.values(activity.copy.status)]) {
            if (/[A-Za-zÀ-ž]{2}/.test(message) && !hasTranslation(message)) missing.add(message);
        }
    }
    assert.deepEqual([...missing], []);
});

test("question images: CSV identifies image-only prompts by description without embedding raster data", () => {
    const question = questionFromDraft({ ...emptyDraft("true_false"), image }, "image", "2026-10-23");
    const csv = attemptsToCsv([{
        id: "image-attempt", studentId: "ani", studentName: "Ani", quizId: "image-quiz", quizName: "Plants", activityId: "fishing",
        startedAt: "2026-10-23T00:00:00Z", completedAt: "2026-10-23T00:00:01Z", total: 1, correct: 1, score: 100,
        records: [{ question, answer: { type: "true_false", value: true }, correct: true }],
    }]);
    assert.ok(csv.includes(image.alt)); assert.equal(csv.includes("base64"), false);
});
