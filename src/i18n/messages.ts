import translations from "./messages-id.json";

/** Only system UI is translated; teacher-authored questions, answers and names are untouched. */
export const MESSAGE_PAIRS: readonly (readonly [string, string])[] = Object.entries(translations);
