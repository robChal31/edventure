/** Only shipped demo metadata is system copy. Never translate teacher-authored quiz/question content. */
type Copy = { message: string; legacy?: readonly string[] };
export const SYSTEM_QUESTS: Readonly<Record<string, { name: Copy; description: Copy }>> = {
    "quiz-sample-catching-bugs": {
        name: { message: "Crickets in the Field", legacy: ["Cricket di Ladang"] },
        description: { message: "Catch crickets and answer questions. Practice lets you try again.", legacy: ["Contoh latihan lintas mapel: tangkap cricket, jawab soal, dan coba lagi kalau lepas. Tujuh soal dalam dua ronde."] },
    },
    "quiz-sample-forest-serenade": {
        name: { message: "Forest Serenade" },
        description: { message: "Play the flute at the altar and answer questions to gather the frogs.", legacy: ["Katak menunggu dekat bukit altar, satu per soal. Jawaban benar mengajak katak bergabung mengelilingi bukit sambil puffing. Selesaikan semua soal untuk mendengar lagu penutup."] },
    },
    "quiz-sample-ocean": {
        name: { message: "Ocean Explorers" },
        description: { message: "A mixed warm-up: multiple choice, true/false and short answers about the sea." },
    },
    "quiz-sample-math": {
        name: { message: "Quick Math Catch" },
        description: { message: "Five fast number questions." },
    },
    "quiz-premade-fractions": {
        name: { message: "Fraction Frenzy" },
        description: { message: "Fractions and multiplication for grade 5." },
    },
};

/** Match BOTH the shipped id and unedited field, including old browser saves. No storage rewrite. */
export function systemQuestText(id: string, field: "name" | "description", value: string, t: (message: string) => string): string {
    const copy = Object.hasOwn(SYSTEM_QUESTS, id) ? SYSTEM_QUESTS[id][field] : undefined;
    if (!copy || (value !== copy.message && !copy.legacy?.includes(value))) return value;
    return t(copy.message);
}
