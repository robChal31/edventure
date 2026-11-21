"use client";

import { useI18n } from "@/i18n/provider";
import type { QuestionDraft } from "@/quiz/question-types";

type Props = {
    draft: QuestionDraft;
    onChange: (patch: Partial<QuestionDraft>) => void;
};

export default function TrueFalseFields({ draft, onChange }: Props) {
    const { t } = useI18n();
    return (
        <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("The statement is…")}</legend>
            <div className="grid grid-cols-2 gap-3">
                {[true, false].map((value) => {
                    const active = draft.correctAnswer === value;
                    const tone = value
                        ? active
                            ? "border-emerald-400 bg-emerald-500 text-emerald-950"
                            : "border-slate-700 text-emerald-300 hover:border-emerald-600"
                        : active
                          ? "border-rose-400 bg-rose-500 text-rose-950"
                          : "border-slate-700 text-rose-300 hover:border-rose-600";

                    return (
                        <button
                            key={String(value)}
                            type="button"
                            onClick={() => onChange({ correctAnswer: value })}
                            aria-pressed={active}
                            className={`flex items-center justify-center gap-2 rounded-xl border-4 px-4 py-4 font-pixel text-xs transition ${tone}`}
                        >
                            {value ? t("✔ TRUE") : t("✘ FALSE")}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
