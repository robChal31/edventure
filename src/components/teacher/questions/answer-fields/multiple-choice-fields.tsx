"use client";

import { MC_MAX_OPTIONS, MC_MIN_OPTIONS, type QuestionDraft } from "@/quiz/question-types";
import { inputClass } from "@/components/ui/panels";

const LETTER_STYLES = [
    "bg-rose-500 text-rose-950",
    "bg-sky-400 text-sky-950",
    "bg-amber-400 text-amber-950",
    "bg-emerald-400 text-emerald-950",
    "bg-violet-400 text-violet-950",
    "bg-orange-400 text-orange-950",
];

type Props = {
    draft: QuestionDraft;
    onChange: (patch: Partial<QuestionDraft>) => void;
};

export default function MultipleChoiceFields({ draft, onChange }: Props) {
    const setOption = (index: number, value: string) => {
        const options = draft.options.slice();
        options[index] = value;
        onChange({ options });
    };

    const removeOption = (index: number) => {
        const options = draft.options.filter((_, i) => i !== index);
        let correctIndex = draft.correctIndex;
        if (index === correctIndex) correctIndex = 0;
        else if (index < correctIndex) correctIndex -= 1;
        onChange({ options, correctIndex });
    };

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Options — select the correct one
            </legend>

            {draft.options.map((option, index) => {
                const correct = index === draft.correctIndex;
                return (
                    <div
                        key={index}
                        className={`flex items-center gap-2 rounded-lg border-2 p-1.5 pr-2 ${
                            correct ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800"
                        }`}
                    >
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-pixel text-[10px] ${
                                LETTER_STYLES[index % LETTER_STYLES.length]
                            }`}
                        >
                            {String.fromCharCode(65 + index)}
                        </span>
                        <input
                            value={option}
                            onChange={(event) => setOption(index, event.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            className={`${inputClass} border-transparent bg-slate-900`}
                            aria-label={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-300">
                            <input
                                type="radio"
                                name="correct-option"
                                checked={correct}
                                onChange={() => onChange({ correctIndex: index })}
                                className="h-4 w-4 accent-emerald-500"
                            />
                            Correct
                        </label>
                        <button
                            type="button"
                            onClick={() => removeOption(index)}
                            disabled={draft.options.length <= MC_MIN_OPTIONS}
                            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300 disabled:opacity-30"
                            aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                        >
                            ✕
                        </button>
                    </div>
                );
            })}

            {draft.options.length < MC_MAX_OPTIONS && (
                <button
                    type="button"
                    onClick={() => onChange({ options: [...draft.options, ""] })}
                    className="self-start rounded-lg border-2 border-dashed border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-sky-500 hover:text-sky-300"
                >
                    + Add option
                </button>
            )}
        </fieldset>
    );
}
