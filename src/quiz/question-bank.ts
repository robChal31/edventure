import type { Question } from "./types";

/**
 * A small built-in question bank so the prototype can be tested
 * immediately without authoring questions. It seeds the teacher's
 * question bank on first run; teachers can edit or delete them.
 * IDs are stable so seeding never duplicates questions.
 */
const mc = (
    id: string,
    subject: string,
    text: string,
    options: string[],
    correctIndex: number
): Question => ({ id, type: "multiple_choice", subject, text, options, correctIndex });

const tf = (
    id: string,
    subject: string,
    text: string,
    correctAnswer: boolean,
    explanation?: string
): Question => ({ id, type: "true_false", subject, text, correctAnswer, explanation });

const short = (
    id: string,
    subject: string,
    text: string,
    acceptedAnswers: string[],
    explanation?: string
): Question => ({ id, type: "short_answer", subject, text, acceptedAnswers, explanation });

export const SAMPLE_QUESTION_BANK: Question[] = [
    mc("bank-1", "Math", "What is 7 + 5?", ["10", "11", "12", "13"], 2),
    mc("bank-2", "Math", "What is 9 × 3?", ["21", "24", "27", "30"], 2),
    mc("bank-3", "Math", "What is half of 50?", ["20", "25", "30", "15"], 1),
    mc("bank-4", "Science", "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1),
    mc("bank-5", "Science", "What gas do plants absorb from the air?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], 2),
    mc("bank-6", "Science", "How many legs does a spider have?", ["6", "8", "10", "12"], 1),
    mc("bank-7", "English", "Which word is a noun?", ["Run", "Quickly", "River", "Blue"], 2),
    mc("bank-8", "English", "What is the opposite of 'deep'?", ["Wide", "Shallow", "Long", "Dark"], 1),
    mc("bank-9", "Geography", "What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
    mc("bank-10", "Geography", "Which continent is the Sahara desert in?", ["Asia", "Africa", "Australia", "Europe"], 1),
    mc("bank-11", "Nature", "What do bees collect from flowers?", ["Leaves", "Nectar", "Bark", "Seeds"], 1),
    mc("bank-12", "Nature", "A group of fish is called a…", ["Flock", "Herd", "School", "Pack"], 2),
    mc("bank-13", "Math", "What number comes after 49?", ["48", "50", "51", "60"], 1),
    mc("bank-14", "Science", "What do fish use to breathe underwater?", ["Lungs", "Gills", "Skin", "Nose"], 1),
    mc("bank-15", "English", "Which sentence is correct?", ["Me like fish.", "I likes fish.", "I like fish.", "Like fish I."], 2),

    tf("bank-tf-1", "Science", "A whale is a fish.", false, "Whales are mammals — they breathe air with lungs."),
    tf("bank-tf-2", "Nature", "Octopuses have eight arms.", true),
    tf("bank-tf-3", "Math", "10 is an odd number.", false, "10 can be split into two equal groups of 5, so it is even."),
    tf("bank-tf-4", "Geography", "The sea tastes salty.", true),
    tf("bank-tf-5", "Science", "The Sun is a star.", true),

    short("bank-sa-1", "Math", "What is 6 × 2?", ["12", "twelve"]),
    short("bank-sa-2", "Science", "What is the colour of a clear daytime sky?", ["blue", "biru"]),
    short("bank-sa-3", "Nature", "Which sea animal has a hard shell and walks sideways?", ["crab", "a crab", "kepiting"]),
    short("bank-sa-4", "English", "Write the plural of \"fish\".", ["fish", "fishes"], "Both are used! \"Fish\" is the most common plural."),
    short("bank-sa-5", "Geography", "What is the capital city of Indonesia?", ["Jakarta"]),
];
