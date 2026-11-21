"use client";

import { useI18n } from "@/i18n/provider";
import type { QuestionDraft } from "@/quiz/question-types";
import { inputClass } from "@/components/ui/panels";

type Props = {
    draft: QuestionDraft;
    onChange: (patch: Partial<QuestionDraft>) => void;
};

export default function ShortAnswerFields({ draft, onChange }: Props) {
    const { t } = useI18n();
    const setAnswer = (index: number, value: string) => {
        const acceptedAnswers = draft.acceptedAnswers.slice();
        acceptedAnswers[index] = value;
        onChange({ acceptedAnswers });
    };

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Accepted answers")}</legend>

            {draft.acceptedAnswers.map((answer, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-center text-emerald-400" aria-hidden>
                        ✔
                    </span>
                    <input
                        value={answer}
                        onChange={(event) => setAnswer(index, event.target.value)}
                        placeholder={index === 0 ? t("e.g. 12") : t("another way to write it, e.g. twelve")}
                        className={inputClass}
                        aria-label={t("Accepted answer {value0}", { value0: index + 1 })}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            onChange({
                                acceptedAnswers: draft.acceptedAnswers.filter((_, i) => i !== index),
                            })
                        }
                        disabled={draft.acceptedAnswers.length <= 1}
                        className="rounded px-2 py-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300 disabled:opacity-30"
                        aria-label={t("Remove accepted answer {value0}", { value0: index + 1 })}
                    >
                        ✕
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={() => onChange({ acceptedAnswers: [...draft.acceptedAnswers, ""] })}
                className="self-start rounded-lg border-2 border-dashed border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-sky-500 hover:text-sky-300"
            >{t("+ Add another accepted answer")}</button>

            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                    type="checkbox"
                    checked={draft.caseSensitive}
                    onChange={(event) => onChange({ caseSensitive: event.target.checked })}
                    className="h-4 w-4 accent-amber-400"
                />{t("Strict: capital letters and accents must match exactly")}</label>

            <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">{t("Answers are forgiving by default: extra spaces, capital letters, accents and punctuation at the ends are ignored, and numbers like")}{" "}<code>12</code>{" "}{t("and")}{" "}
                <code>12.0</code>{" "}{t("match.")}</p>
        </fieldset>
    );
}
