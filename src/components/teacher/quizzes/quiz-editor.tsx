"use client";

import { useMemo, useState } from "react";
import { ACTIVITIES, getActivity } from "@/quiz/activities";
import { emptyDraft, type QuestionDraft } from "@/quiz/question-types";
import { CURRICULA, type CurriculumId } from "@/quiz/taxonomy";
import type { ActivityId, Question } from "@/quiz/types";
import {
    authoringSchoolId,
    studentsInScope,
    visibleClasses,
    visibleQuestions,
    visibleStudents,
} from "@/lms/access";
import { useClasses, useQuestions, useSchools, useSignedInStaff, useStudents } from "@/lms/hooks";
import { listSubjects, listTopics } from "@/lms/repositories/question-repository";
import { schoolName } from "@/lms/repositories/organisation-repository";
import { saveQuiz, validateQuizDraft, type QuizDraft } from "@/lms/repositories/quiz-repository";
import Modal from "@/components/ui/modal";
import { ErrorList, Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";
import { ActivityGuideDetails } from "@/components/ui/activity-guide";
import ClassificationFields from "../classification/classification-fields";
import QuestionEditor from "../questions/question-editor";
import AssignmentPicker from "./assignment-picker";
import QuestionPicker from "./question-picker";

type QuizEditorProps = {
    draft: QuizDraft | null;
    onClose: () => void;
};

export default function QuizEditor({ draft, onClose }: QuizEditorProps) {
    return (
        <Modal open={draft !== null} title={draft?.id ? "Edit quiz" : "New quiz"} onClose={onClose} size="xl">
            {draft && <EditorForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
        </Modal>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    hint: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-800 px-3 py-2 hover:border-slate-600">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-400"
            />
            <span>
                <span className="block text-sm font-semibold text-slate-100">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
            </span>
        </label>
    );
}

/** The activity (game map) the quiz is played in. */
function ActivityPicker({ value, onChange }: { value: ActivityId; onChange: (id: ActivityId) => void }) {
    return (
        <Field label="Activity (map)" hint="The game world students play the quiz in. More maps are coming.">
            <div className="grid gap-2 sm:grid-cols-2">
                {ACTIVITIES.map((activity) => {
                    const active = value === activity.id;
                    return (
                        <button
                            key={activity.id}
                            type="button"
                            aria-pressed={active}
                            disabled={!activity.available}
                            onClick={() => onChange(activity.id)}
                            className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                active ? "border-amber-400 bg-amber-400/15" : "border-slate-700 hover:border-slate-500"
                            }`}
                        >
                            <span className="text-2xl" aria-hidden>{activity.icon}</span>
                            <span className="text-sm font-bold text-slate-100">{activity.label}</span>
                            <span className="text-[11px] text-slate-400">📍 {activity.location}</span>
                            <span className="text-[11px] text-slate-500">{activity.tagline}</span>
                        </button>
                    );
                })}
                <div className="flex flex-col items-start gap-1 rounded-xl border-2 border-dashed border-slate-800 p-3 text-slate-500">
                    <span className="text-2xl" aria-hidden>🗺️</span>
                    <span className="text-sm font-semibold">More maps</span>
                    <span className="text-[11px]">Coming soon</span>
                </div>
            </div>
        </Field>
    );
}

function EditorForm({ initial, onClose }: { initial: QuizDraft; onClose: () => void }) {
    const actor = useSignedInStaff();
    const allQuestions = useQuestions();
    const allStudents = useStudents();
    const allClasses = useClasses();
    const schools = useSchools();

    const [draft, setDraft] = useState<QuizDraft>(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState<QuestionDraft | null>(null);

    const questions = useMemo(() => visibleQuestions(actor, allQuestions), [actor, allQuestions]);
    const students = useMemo(
        () => studentsInScope(draft.schoolId, visibleStudents(actor, allStudents)),
        [actor, allStudents, draft.schoolId]
    );
    const classes = useMemo(
        () =>
            visibleClasses(actor, allClasses).filter(
                (klass) => draft.schoolId === null || klass.schoolId === draft.schoolId
            ),
        [actor, allClasses, draft.schoolId]
    );
    const subjects = useMemo(() => listSubjects(questions), [questions]);
    const topics = useMemo(() => listTopics(questions), [questions]);

    const patch = (changes: Partial<QuizDraft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setErrors([]);
    };

    const save = () => {
        const problems = validateQuizDraft(draft);
        if (problems.length > 0) {
            setErrors(problems);
            return;
        }
        saveQuiz(draft);
        onClose();
    };

    const activity = getActivity(draft.activityId);
    const ownerName = draft.schoolId === null || draft.schoolId === undefined ? "the global bank (everyone)" : schoolName(draft.schoolId);
    const everyoneLabel =
        draft.schoolId === null || draft.schoolId === undefined
            ? "Every student on the platform."
            : `Every student of ${schools.find((s) => s.id === draft.schoolId)?.name ?? "this school"}.`;

    return (
        <>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    save();
                }}
            >
                <p className="mb-4 text-xs text-slate-500">Saved to: {ownerName}</p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="flex flex-col gap-4">
                        <Field label="Quiz name">
                            <input
                                value={draft.name}
                                onChange={(event) => patch({ name: event.target.value })}
                                placeholder="e.g. Cells and Organisms"
                                className={inputClass}
                                autoFocus
                            />
                        </Field>
                        <Field label="Description" hint="Shown on the student's quest board.">
                            <textarea
                                value={draft.description}
                                onChange={(event) => patch({ description: event.target.value })}
                                rows={2}
                                placeholder="What is this quest about?"
                                className={inputClass}
                            />
                        </Field>

                        <ClassificationFields
                            value={draft}
                            onChange={patch}
                            knownSubjects={subjects}
                            knownTopics={topics}
                            compact
                        />
                        <p className="-mt-2 text-[11px] text-slate-500">
                            Quiz labels: {draft.curriculum ? CURRICULA[draft.curriculum as CurriculumId].label : "curriculum not set"}
                        </p>

                        <ActivityPicker value={draft.activityId} onChange={(activityId) => patch({ activityId })} />
                        {draft.activityId === "catching_bugs" && (
                            <Field label="Mode Catching Bugs" hint="Tidak ada nyawa barn. Setiap jawaban salah menambah miss.">
                                <select
                                    value={draft.mode}
                                    onChange={(event) => patch({ mode: event.target.value === "practice" ? "practice" : "assessment" })}
                                    className={inputClass}
                                >
                                    <option value="assessment">Asesmen — satu percobaan per soal</option>
                                    <option value="practice">Latihan — cricket yang lepas bisa dicoba lagi</option>
                                </select>
                            </Field>
                        )}
                        <ActivityGuideDetails activity={activity} />

                        <Toggle
                            checked={draft.published}
                            onChange={(published) => patch({ published })}
                            label="Published"
                            hint="Visible on assigned students' quest boards. Untick to keep it as a draft."
                        />
                        <Toggle
                            checked={draft.shuffleQuestions}
                            onChange={(shuffleQuestions) => patch({ shuffleQuestions })}
                            label="Shuffle questions"
                            hint="Every play-through asks the questions in a new order."
                        />

                        <AssignmentPicker
                            assignment={draft.assignment}
                            students={students}
                            classes={classes}
                            everyoneLabel={everyoneLabel}
                            onChange={(assignment) => patch({ assignment })}
                        />
                    </div>

                    <QuestionPicker
                        questions={questions}
                        selectedIds={draft.questionIds}
                        onChange={(questionIds) => patch({ questionIds })}
                        onCreateNew={() => setNewQuestion({ ...emptyDraft(), schoolId: authoringSchoolId(actor) })}
                    />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t-2 border-slate-800 pt-4">
                    <ErrorList errors={errors} />
                    <div className="flex justify-end gap-2">
                        <PixelButton tone="slate" onClick={onClose}>
                            Cancel
                        </PixelButton>
                        <PixelButton tone="emerald" type="submit">
                            💾 Save quiz
                        </PixelButton>
                    </div>
                </div>
            </form>

            {/* Sibling of the quiz form: the question editor has its own form. */}
            <QuestionEditor
                draft={newQuestion}
                subjects={subjects}
                topics={topics}
                ownerLabel={authoringSchoolId(actor) === null ? "Global bank" : schoolName(authoringSchoolId(actor))}
                onClose={() => setNewQuestion(null)}
                onSaved={(question: Question) => patch({ questionIds: [...draft.questionIds, question.id] })}
            />
        </>
    );
}
