"use client";

import { useI18n } from "@/i18n/provider";
import { useId } from "react";
import {
    COGNITIVE_LEVELS,
    CURRICULA,
    CURRICULUM_ORDER,
    DIFFICULTIES,
    SUBJECTS,
    stageOfGrade,
    GRADE_STAGES,
    type CognitiveLevel,
    type CurriculumId,
    type Difficulty,
} from "@/quiz/taxonomy";
import { Field, inputClass } from "@/components/ui/panels";

/** The labels every question and quiz carries (see quiz/taxonomy.ts). */
export type ClassificationValue = {
    grade: number | null;
    subject: string;
    topic: string;
    curriculum: CurriculumId | "";
    difficulty: Difficulty;
    cognitiveLevel: CognitiveLevel;
    tagsText: string;
};

type Props = {
    value: ClassificationValue;
    onChange: (changes: Partial<ClassificationValue>) => void;
    /** Subjects / topics already used in the bank, offered as suggestions. */
    knownSubjects?: string[];
    knownTopics?: string[];
    /** Show the grade field as required (quizzes and questions both need it). */
    requireAll?: boolean;
    /** Hide difficulty and thinking level (e.g. for quizzes). */
    compact?: boolean;
};

/** Grade picker grouped by school stage. */
export function GradeSelect({
    value,
    onChange,
    id,
}: {
    value: number | null;
    onChange: (grade: number | null) => void;
    id?: string;
}) {
    const { t } = useI18n();
    return (
        <select
            id={id}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
            className={inputClass}
        >
            <option value="">{t("Choose a grade…")}</option>
            {(Object.keys(GRADE_STAGES) as (keyof typeof GRADE_STAGES)[]).map((stage) => (
                <optgroup key={stage} label={t(GRADE_STAGES[stage].label)}>
                    {GRADE_STAGES[stage].grades.map((grade) => (
                        <option key={grade} value={grade}>{t("Grade")}{" "}{grade}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}

export default function ClassificationFields({
    value,
    onChange,
    knownSubjects = [],
    knownTopics = [],
    compact = false,
}: Props) {
    const { t } = useI18n();
    const subjectListId = useId();
    const topicListId = useId();
    const subjectOptions = Array.from(new Set([...SUBJECTS, ...knownSubjects])).sort((a, b) =>
        a.localeCompare(b)
    );

    return (
        <fieldset className="flex flex-col gap-4 rounded-xl border-2 border-slate-800 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Labels · used to find and report on it")}</legend>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label={t("Grade (suitable for)")}
                    hint={value.grade ? t("{value0}", { value0: t(GRADE_STAGES[stageOfGrade(value.grade)].label) }) : t("The class level it is written for.")}
                >
                    <GradeSelect value={value.grade} onChange={(grade) => onChange({ grade })} />
                </Field>
                <Field label={t("Subject")}>
                    <input
                        value={value.subject}
                        onChange={(event) => onChange({ subject: event.target.value })}
                        list={subjectListId}
                        placeholder={t("e.g. Mathematics")}
                        className={inputClass}
                    />
                    <datalist id={subjectListId}>
                        {subjectOptions.map((subject) => (
                            <option key={subject} value={subject} />
                        ))}
                    </datalist>
                </Field>
                <Field label={t("Topic")}>
                    <input
                        value={value.topic}
                        onChange={(event) => onChange({ topic: event.target.value })}
                        list={topicListId}
                        placeholder={t("e.g. Fractions")}
                        className={inputClass}
                    />
                    <datalist id={topicListId}>
                        {knownTopics.map((topic) => (
                            <option key={topic} value={topic} />
                        ))}
                    </datalist>
                </Field>
                <Field label={t("Curriculum")}>
                    <select
                        value={value.curriculum}
                        onChange={(event) => onChange({ curriculum: event.target.value as CurriculumId | "" })}
                        className={inputClass}
                    >
                        <option value="">{t("Choose a curriculum…")}</option>
                        {CURRICULUM_ORDER.map((id) => (
                            <option key={id} value={id}>
                                {t(CURRICULA[id].label)} — {t(CURRICULA[id].hint)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            {!compact && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Difficulty")}>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    aria-pressed={value.difficulty === level}
                                    onClick={() => onChange({ difficulty: level })}
                                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                                        value.difficulty === level
                                            ? "bg-amber-400 text-amber-950"
                                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    }`}
                                >
                                    {DIFFICULTIES[level].icon} {t(DIFFICULTIES[level].label)}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label={t("Thinking level")} hint={t(COGNITIVE_LEVELS[value.cognitiveLevel].hint)}>
                        <select
                            value={value.cognitiveLevel}
                            onChange={(event) => onChange({ cognitiveLevel: event.target.value as CognitiveLevel })}
                            className={inputClass}
                        >
                            {(Object.keys(COGNITIVE_LEVELS) as CognitiveLevel[]).map((level) => (
                                <option key={level} value={level}>
                                    {t(COGNITIVE_LEVELS[level].label)}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            )}

            <Field label={t("Tags")} hint={t("Comma separated, e.g. fractions, word-problem")}>
                <input
                    value={value.tagsText}
                    onChange={(event) => onChange({ tagsText: event.target.value })}
                    placeholder={t("fractions, word-problem")}
                    className={inputClass}
                />
            </Field>
        </fieldset>
    );
}

