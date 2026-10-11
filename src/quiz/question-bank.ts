import type { Question } from "./types";

/**
 * A small built-in question bank so the prototype can be tested
 * immediately without authoring questions. Teachers may also add their
 * own questions in the quiz creator.
 */
const q = (
    id: string,
    subject: string,
    text: string,
    options: string[],
    correctIndex: number
): Question => ({ id, subject, text, options, correctIndex });

export const SAMPLE_QUESTION_BANK: Question[] = [
    q("bank-1", "Math", "What is 7 + 5?", ["10", "11", "12", "13"], 2),
    q("bank-2", "Math", "What is 9 × 3?", ["21", "24", "27", "30"], 2),
    q("bank-3", "Math", "What is half of 50?", ["20", "25", "30", "15"], 1),
    q("bank-4", "Science", "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1),
    q("bank-5", "Science", "What gas do plants absorb from the air?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], 2),
    q("bank-6", "Science", "How many legs does a spider have?", ["6", "8", "10", "12"], 1),
    q("bank-7", "English", "Which word is a noun?", ["Run", "Quickly", "River", "Blue"], 2),
    q("bank-8", "English", "What is the opposite of 'deep'?", ["Wide", "Shallow", "Long", "Dark"], 1),
    q("bank-9", "Geography", "What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
    q("bank-10", "Geography", "Which continent is the Sahara desert in?", ["Asia", "Africa", "Australia", "Europe"], 1),
    q("bank-11", "Nature", "What do bees collect from flowers?", ["Leaves", "Nectar", "Bark", "Seeds"], 1),
    q("bank-12", "Nature", "A group of fish is called a…", ["Flock", "Herd", "School", "Pack"], 2),
    q("bank-13", "Math", "What number comes after 49?", ["48", "50", "51", "60"], 1),
    q("bank-14", "Science", "What do fish use to breathe underwater?", ["Lungs", "Gills", "Skin", "Nose"], 1),
    q("bank-15", "English", "Which sentence is correct?", ["Me like fish.", "I likes fish.", "I like fish.", "Like fish I."], 2),
];
