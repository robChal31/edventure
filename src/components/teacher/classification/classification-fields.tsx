"use client";

import FormSelect, { CreatableField } from "@/components/ui/form-select";

import { useI18n } from "@/i18n/provider";
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
        <FormSelect
            id={id}
            value={value ?? ""}
            onValueChange={(event) => onChange(event ? Number(event) : null)}
            className="w-full"
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
        </FormSelect>
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
                    <CreatableField value={value.subject} onValueChange={(subject) => onChange({ subject })}
                        options={subjectOptions} placeholder={t("e.g. Mathematics")} aria-label={t("Subject")} />
                </Field>
                <Field label={t("Topic")}>
                    <CreatableField value={value.topic} onValueChange={(topic) => onChange({ topic })}
                        options={knownTopics} placeholder={t("e.g. Fractions")} aria-label={t("Topic")} />
                </Field>
                <Field label={t("Curriculum")}>
                    <FormSelect
                        value={value.curriculum}
                        onValueChange={(event) => onChange({ curriculum: event as CurriculumId | "" })}
                        className="w-full"
                    >
                        <option value="">{t("Choose a curriculum…")}</option>
                        {CURRICULUM_ORDER.map((id) => (
                            <option key={id} value={id}>
                                {t(CURRICULA[id].label)} — {t(CURRICULA[id].hint)}
                            </option>
                        ))}
                    </FormSelect>
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
                        <FormSelect
                            value={value.cognitiveLevel}
                            onValueChange={(event) => onChange({ cognitiveLevel: event as CognitiveLevel })}
                            className="w-full"
                        >
                            {(Object.keys(COGNITIVE_LEVELS) as CognitiveLevel[]).map((level) => (
                                <option key={level} value={level}>
                                    {t(COGNITIVE_LEVELS[level].label)}
                                </option>
                            ))}
                        </FormSelect>
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

