import type { Classification, Question } from "./types";
import type { CurriculumId, Difficulty, CognitiveLevel } from "./taxonomy";

/**
 * Premade questions owned by the global bank (`schoolId: null`). Only the
 * super admin can edit them; school staff can copy them into their school.
 * They seed the bank on first run so the whole system is testable right away.
 * IDs are stable so seeding never duplicates questions.
 */

type Label = {
    grade: number;
    subject: string;
    topic: string;
    curriculum: CurriculumId;
    difficulty?: Difficulty;
    level?: CognitiveLevel;
    tags?: string[];
};

const label = (l: Label): Classification => ({
    grade: l.grade,
    subject: l.subject,
    topic: l.topic,
    curriculum: l.curriculum,
    difficulty: l.difficulty ?? "easy",
    cognitiveLevel: l.level ?? "remember",
    tags: l.tags ?? [],
});

const mc = (
    id: string,
    l: Label,
    text: string,
    options: string[],
    correctIndex: number,
    explanation?: string
): Question => ({
    id,
    type: "multiple_choice",
    text,
    options,
    correctIndex,
    explanation,
    schoolId: null,
    ...label(l),
});

const tf = (
    id: string,
    l: Label,
    text: string,
    correctAnswer: boolean,
    explanation?: string
): Question => ({
    id,
    type: "true_false",
    text,
    correctAnswer,
    explanation,
    schoolId: null,
    ...label(l),
});

const short = (
    id: string,
    l: Label,
    text: string,
    acceptedAnswers: string[],
    explanation?: string
): Question => ({
    id,
    type: "short_answer",
    text,
    acceptedAnswers,
    explanation,
    schoolId: null,
    ...label(l),
});

export const SAMPLE_QUESTION_BANK: Question[] = [
    // ── Original premade set (now labelled) ──
    mc("bank-1", { grade: 2, subject: "Mathematics", topic: "Addition within 20", curriculum: "merdeka", tags: ["addition"] }, "What is 7 + 5?", ["10", "11", "12", "13"], 2),
    mc("bank-2", { grade: 3, subject: "Mathematics", topic: "Multiplication tables", curriculum: "merdeka", level: "apply", tags: ["multiplication"] }, "What is 9 × 3?", ["21", "24", "27", "30"], 2),
    mc("bank-3", { grade: 2, subject: "Mathematics", topic: "Halves", curriculum: "merdeka", level: "apply", tags: ["fractions"] }, "What is half of 50?", ["20", "25", "30", "15"], 1),
    mc("bank-4", { grade: 4, subject: "Science", topic: "Planets of the Solar System", curriculum: "merdeka", tags: ["space"] }, "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1),
    mc("bank-5", { grade: 5, subject: "Science", topic: "Photosynthesis", curriculum: "k13", level: "understand", tags: ["plants"] }, "What gas do plants absorb from the air?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], 2),
    mc("bank-6", { grade: 3, subject: "Science", topic: "Animal groups", curriculum: "cambridge", tags: ["animals"] }, "How many legs does a spider have?", ["6", "8", "10", "12"], 1),
    mc("bank-7", { grade: 3, subject: "English", topic: "Parts of speech", curriculum: "cambridge", tags: ["grammar"] }, "Which word is a noun?", ["Run", "Quickly", "River", "Blue"], 2),
    mc("bank-8", { grade: 2, subject: "English", topic: "Antonyms", curriculum: "cambridge", tags: ["vocabulary"] }, "What is the opposite of 'deep'?", ["Wide", "Shallow", "Long", "Dark"], 1),
    mc("bank-9", { grade: 4, subject: "Geography", topic: "Oceans of the world", curriculum: "merdeka", tags: ["ocean"] }, "What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
    mc("bank-10", { grade: 5, subject: "Geography", topic: "Continents and deserts", curriculum: "k13", tags: ["desert"] }, "Which continent is the Sahara desert in?", ["Asia", "Africa", "Australia", "Europe"], 1),
    mc("bank-11", { grade: 3, subject: "Science", topic: "Pollination", curriculum: "merdeka", tags: ["insects"] }, "What do bees collect from flowers?", ["Leaves", "Nectar", "Bark", "Seeds"], 1),
    mc("bank-12", { grade: 3, subject: "Science", topic: "Animal groups", curriculum: "ib", tags: ["ocean", "animals"] }, "A group of fish is called a…", ["Flock", "Herd", "School", "Pack"], 2),
    mc("bank-13", { grade: 1, subject: "Mathematics", topic: "Counting to 100", curriculum: "merdeka", tags: ["counting"] }, "What number comes after 49?", ["48", "50", "51", "60"], 1),
    mc("bank-14", { grade: 4, subject: "Science", topic: "Animal adaptations", curriculum: "merdeka", level: "understand", tags: ["ocean", "animals"] }, "What do fish use to breathe underwater?", ["Lungs", "Gills", "Skin", "Nose"], 1),
    mc("bank-15", { grade: 3, subject: "English", topic: "Simple present tense", curriculum: "cambridge", level: "apply", tags: ["grammar"] }, "Which sentence is correct?", ["Me like fish.", "I likes fish.", "I like fish.", "Like fish I."], 2),

    tf("bank-tf-1", { grade: 4, subject: "Science", topic: "Classifying animals", curriculum: "merdeka", level: "understand", tags: ["ocean", "animals"] }, "A whale is a fish.", false, "Whales are mammals — they breathe air with lungs."),
    tf("bank-tf-2", { grade: 3, subject: "Science", topic: "Sea animals", curriculum: "ib", tags: ["ocean", "animals"] }, "Octopuses have eight arms.", true),
    tf("bank-tf-3", { grade: 3, subject: "Mathematics", topic: "Odd and even numbers", curriculum: "merdeka", level: "understand", tags: ["numbers"] }, "10 is an odd number.", false, "10 can be split into two equal groups of 5, so it is even."),
    tf("bank-tf-4", { grade: 2, subject: "Science", topic: "Water and the sea", curriculum: "general", tags: ["ocean"] }, "The sea tastes salty.", true),
    tf("bank-tf-5", { grade: 4, subject: "Science", topic: "The Sun", curriculum: "cambridge", tags: ["space"] }, "The Sun is a star.", true),

    short("bank-sa-1", { grade: 2, subject: "Mathematics", topic: "Multiplication basics", curriculum: "merdeka", level: "apply", tags: ["multiplication"] }, "What is 6 × 2?", ["12", "twelve"]),
    short("bank-sa-2", { grade: 1, subject: "Science", topic: "Weather and the sky", curriculum: "general", tags: ["weather"] }, "What is the colour of a clear daytime sky?", ["blue", "biru"]),
    short("bank-sa-3", { grade: 3, subject: "Science", topic: "Sea animals", curriculum: "merdeka", tags: ["ocean", "animals"] }, "Which sea animal has a hard shell and walks sideways?", ["crab", "a crab", "kepiting"]),
    short("bank-sa-4", { grade: 4, subject: "English", topic: "Plural nouns", curriculum: "cambridge", level: "understand", difficulty: "medium", tags: ["grammar"] }, 'Write the plural of "fish".', ["fish", "fishes"], 'Both are used! "Fish" is the most common plural.'),
    short("bank-sa-5", { grade: 5, subject: "Social Studies", topic: "Indonesia's capital", curriculum: "merdeka", tags: ["indonesia"] }, "What is the capital city of Indonesia?", ["Jakarta"]),

    // ── Additional premade questions across grades and curricula ──
    mc("pre-math-g5-fractions", { grade: 5, subject: "Mathematics", topic: "Adding fractions", curriculum: "merdeka", difficulty: "medium", level: "apply", tags: ["fractions"] }, "What is 1/2 + 1/4?", ["1/6", "2/6", "3/4", "2/4"], 2, "Change 1/2 to 2/4, then add: 2/4 + 1/4 = 3/4."),
    mc("pre-sci-g7-cells", { grade: 7, subject: "Science", topic: "Cells", curriculum: "k13", tags: ["biology"] }, "What is the basic unit of life?", ["Atom", "Cell", "Organ", "Molecule"], 1),
    tf("pre-sci-g8-gravity", { grade: 8, subject: "Science", topic: "Forces and motion", curriculum: "k13", level: "understand", tags: ["physics"] }, "Gravity pulls objects toward the centre of the Earth.", true),
    mc("pre-eng-g7-past", { grade: 7, subject: "English", topic: "Past simple tense", curriculum: "cambridge", difficulty: "medium", level: "apply", tags: ["grammar"] }, "Choose the past tense: \"She ___ to school yesterday.\"", ["go", "goes", "went", "going"], 2),
    short("pre-soc-g6-independence", { grade: 6, subject: "History", topic: "Indonesian independence", curriculum: "merdeka", tags: ["indonesia"] }, "In which year did Indonesia declare its independence?", ["1945"]),
    mc("pre-math-g8-linear", { grade: 8, subject: "Mathematics", topic: "Linear equations", curriculum: "ib", difficulty: "hard", level: "apply", tags: ["algebra"] }, "What is x in 2x + 6 = 14?", ["3", "4", "5", "8"], 1, "2x = 8, so x = 4."),
    short("pre-sci-g10-ph", { grade: 10, subject: "Science", topic: "Acids and bases", curriculum: "general", difficulty: "medium", tags: ["chemistry"] }, "What is the pH of a neutral solution at 25 °C?", ["7", "seven"]),
    tf("pre-geo-g6-plates", { grade: 6, subject: "Geography", topic: "Plate tectonics", curriculum: "ib", difficulty: "medium", level: "understand", tags: ["earth"] }, "Earthquakes happen mostly at the edges of tectonic plates.", true),
];

/** Premade question ids, for quick checks (e.g. migration of legacy data). */
export const SAMPLE_QUESTION_IDS: ReadonlySet<string> = new Set(
    SAMPLE_QUESTION_BANK.map((question) => question.id)
);
