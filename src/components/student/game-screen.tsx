"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import PhaserGame from "@/game/PhaserGame";
import type { ActivityController, ActivityPhase, ActivityHudState, GameEvent, GameOptions, MapId } from "@/game/game-options";
import { getActivity } from "@/quiz/activities";
import type { ActivityId, AnswerValue, PlayableQuiz, Question, QuizSummary } from "@/quiz/types";
import type { MusicState } from "@/game/common/audio/map-music";
import type { ActivityProgress } from "@/quiz/progress";
import { checkpointId, checkpointStore, removeCheckpoint, saveCheckpoint, type QuizCheckpoint } from "@/lms/repositories/checkpoint-repository";
import { createId } from "@/lms/ids";
import { useI18n } from "@/i18n/provider";
import { systemQuestText } from "@/i18n/system-quests";
import { ActivityGuideDialog } from "@/components/ui/activity-guide";
import Modal from "@/components/ui/modal";
import PixelButton from "@/components/ui/pixel-button";
import WorldLoading from "@/components/ui/world-loading";
import ActivityHud from "./activity-hud";
import QuestionCard, { type AnswerReveal } from "./questions/question-card";
import ResultsScreen from "./results-screen";
import TouchControls from "./touch-controls";
import EquipmentPicker from "./equipment-picker";
import GameHelp from "./game-help";
import GameSettings, { GameSettingsButton } from "./game-settings";
import InventoryPanel from "./inventory-panel";
import type { InventoryItems } from "@/game/inventory/inventory";
import { EQUIPMENT, defaultEquipment, type EquipmentState } from "@/game/equipment/equipment";

export type HubControls = {
    ready: boolean;
    startQuiz: (quiz: PlayableQuiz) => void;
    setOverlayOpen: (open: boolean) => void;
};
type ProgressOptions = {
    studentId: string;
    /** Recheck assignment/publication, not just the existence of a local checkpoint. */
    canResumeQuiz: (quizId: string) => boolean;
    buildQuiz: (quizId: string) => PlayableQuiz | null;
};
type GameScreenProps = {
    initialQuiz?: PlayableQuiz;
    playerName?: string;
    renderHub?: (controls: HubControls) => ReactNode;
    badge?: ReactNode;
    ribbon?: string;
    exit: { label: string; onExit: () => void };
    onQuizComplete?: (summary: QuizSummary, startedAt: string, runId: string) => void;
    resultsNote?: string;
    progress?: ProgressOptions;
};
type CurrentQuestion = { question: Question; questionNumber: number; total: number };
type Run = { id: string; startedAt: string; quiz: PlayableQuiz; resumed: boolean };
type LeaveAction = "hub" | "exit" | "reload";

export default function GameScreen({ initialQuiz, playerName, renderHub, badge, ribbon, exit, onQuizComplete, resultsNote, progress }: GameScreenProps) {
    const { t } = useI18n();
    const [controller, setController] = useState<ActivityController | null>(null);
    const controllerRef = useRef<ActivityController | null>(null);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(0);
    const [music, setMusic] = useState<MusicState>({ available: false, enabled: true, playing: false });
    const [mapId, setMapId] = useState<MapId | null>(null);
    const [activityId, setActivityId] = useState<ActivityId | null>(null);
    const [travelling, setTravelling] = useState(false);
    const [phase, setPhase] = useState<ActivityPhase>("idle");
    const [hud, setHud] = useState<ActivityHudState>({ caught: 0, answered: 0, total: 0, questionNumber: 1 });
    const [current, setCurrent] = useState<CurrentQuestion | null>(null);
    const [reveal, setReveal] = useState<AnswerReveal | null>(null);
    const [prompt, setPrompt] = useState<string | null>(null);
    const [summary, setSummary] = useState<QuizSummary | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<PlayableQuiz | null>(initialQuiz ?? null);
    const [hubOverlayOpen, setHubOverlayOpen] = useState(false);
    const [leaveAction, setLeaveAction] = useState<LeaveAction | null>(null);
    const [guideOpen, setGuideOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [items, setItems] = useState<InventoryItems>({ wood: 0 });
    const [equipment, setEquipment] = useState<EquipmentState>({ equipped: defaultEquipment(initialQuiz?.activityId), locked: true, actionEnabled: false });
    const [closeRequest, setCloseRequest] = useState<number | null>(null);
    const [closedReceipt, setClosedReceipt] = useState<number | null>(null);
    const [selectedSave, setSelectedSave] = useState<QuizCheckpoint | null>(null);
    const [offerResume, setOfferResume] = useState(true);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [completionSaveFailed, setCompletionSaveFailed] = useState(false);
    const savedRuns = useSyncExternalStore(checkpointStore.subscribe, checkpointStore.getSnapshot, checkpointStore.getServerSnapshot);
    const pendingFreshQuiz = useRef<PlayableQuiz | null>(null);
    const acknowledgedClose = useRef<number | null>(null);
    const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const run = useRef<Run | null>(null);
    const lastProgress = useRef<ActivityProgress | null>(null);
    const completed = useRef(false);
    const pendingCompletion = useRef<{ summary: QuizSummary; run: Run } | null>(null);
    const allowUnload = useRef(false);
    const live = useRef({ onQuizComplete, progress, initialQuiz });
    useEffect(() => { live.current = { onQuizComplete, progress, initialQuiz }; });

    const saveRun = useCallback((snapshot?: ActivityProgress): boolean => {
        const owner = live.current.progress;
        const active = run.current;
        const state = snapshot ?? controllerRef.current?.getProgress() ?? lastProgress.current;
        if (!owner || !active || !state) return false;
        try {
            saveCheckpoint({ studentId: owner.studentId, runId: active.id, startedAt: active.startedAt, quiz: active.quiz, progress: state });
            setSaveError(null);
            return true;
        } catch {
            setSaveError("Progress could not be saved. Storage may be full or unavailable. Keep this tab open and try again.");
            return false;
        }
    }, []);

    // Result writes must be durable before the checkpoint or the results screen can be left.
    // Retain the exact run/summary for retry if localStorage is full or temporarily blocked.
    const persistCompletion = useCallback((): boolean => {
        const pending = pendingCompletion.current;
        if (!pending) return true;
        try {
            live.current.onQuizComplete?.(pending.summary, pending.run.startedAt, pending.run.id);
        } catch {
            setCompletionSaveFailed(true);
            return false;
        }
        pendingCompletion.current = null;
        setCompletionSaveFailed(false);
        const owner = live.current.progress;
        if (owner) {
            // A failed cleanup is harmless: retrying this completed checkpoint is idempotent.
            try { removeCheckpoint(owner.studentId, pending.run.quiz.id, pending.run.id); } catch { /* Keep the durable result. */ }
        }
        return true;
    }, []);

    const resetActivityUi = useCallback(() => {
        if (promptTimer.current) clearTimeout(promptTimer.current);
        setInventoryOpen(false); setSettingsOpen(false); setPhase("idle"); setCurrent(null); setReveal(null); setSummary(null); setPrompt(null);
        setCloseRequest(null); setClosedReceipt(null); setCompletionSaveFailed(false);
    }, []);

    const handleEvent = useCallback((event: GameEvent) => {
        switch (event.type) {
            case "game:loading": setLoading(event.progress); break;
            case "music": setMusic(event); break;
            case "inventory": setItems(event.items); break;
            case "progress":
                lastProgress.current = event.progress;
                if (!completed.current) saveRun(event.progress);
                break;
            case "equipment": setEquipment({ equipped: event.equipped, locked: event.locked, actionEnabled: event.actionEnabled }); break;
            case "question:close": setCloseRequest(event.requestId); break;
            case "game:ready": setReady(true); break;
            case "map:loaded": {
                resetActivityUi(); setMapId(event.mapId); setActivityId(event.activityId); setTravelling(false); setLeaveAction(null);
                if (event.activityId) {
                    if (!run.current && live.current.initialQuiz) run.current = { id: createId("run"), startedAt: new Date().toISOString(), quiz: live.current.initialQuiz, resumed: false };
                    completed.current = false;
                    setGuideOpen(!run.current?.resumed);
                } else {
                    run.current = null; lastProgress.current = null; setActiveQuiz(null); setGuideOpen(false);
                }
                break;
            }
            case "travel:start": setTravelling(true); setHubOverlayOpen(false); setHelpOpen(false); setGuideOpen(false); resetActivityUi(); break;
            case "phase":
                setPhase(event.phase);
                if (event.phase !== "answering" && event.phase !== "closing-question") { setCurrent(null); setReveal(null); }
                break;
            case "hud": setHud({ caught: event.caught, answered: event.answered, total: event.total, questionNumber: event.questionNumber,
                misses: event.misses, round: event.round, rounds: event.rounds, mode: event.mode }); break;
            case "question":
                setCloseRequest(null); setClosedReceipt(null); setReveal(null);
                setCurrent({ question: event.question, questionNumber: event.questionNumber, total: event.total }); break;
            case "answer": setReveal({ correct: event.correct, answer: event.answer, correctAnswer: event.correctAnswer, retryable: event.retryable }); break;
            case "prompt":
                setPrompt(event.message);
                if (promptTimer.current) clearTimeout(promptTimer.current);
                if (event.message) promptTimer.current = setTimeout(() => setPrompt(null), Math.max(2800, event.message.length * 55));
                break;
            case "complete": {
                if (completed.current) break;
                completed.current = true; setSummary(event.summary);
                const active = run.current;
                if (!active) break;
                pendingCompletion.current = { summary: event.summary, run: active };
                persistCompletion();
                break;
            }
        }
    }, [resetActivityUi, saveRun, persistCompletion]);

    // Browsers deliberately do not allow custom buttons/text in beforeunload. Save synchronously
    // and use the native confirmation for toolbar refresh/close; keyboard refresh gets our choices.
    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (pendingCompletion.current) {
                if (persistCompletion()) return;
            } else {
                if (allowUnload.current || !run.current || completed.current) return;
                saveRun();
            }
            event.preventDefault(); event.returnValue = "";
        };
        const pageHide = () => {
            if (pendingCompletion.current) persistCompletion();
            else if (run.current && !completed.current) saveRun();
        };
        const refreshKey = (event: KeyboardEvent) => {
            if (!run.current || completed.current || event.repeat) return;
            if (event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r")) {
                event.preventDefault(); event.stopPropagation(); setLeaveAction("reload");
            }
        };
        window.addEventListener("beforeunload", beforeUnload);
        window.addEventListener("pagehide", pageHide);
        window.addEventListener("keydown", refreshKey, true);
        return () => {
            window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("pagehide", pageHide);
            window.removeEventListener("keydown", refreshKey, true);
            if (promptTimer.current) clearTimeout(promptTimer.current);
        };
    }, [saveRun, persistCompletion]);

    const isHub = Boolean(mapId) && !activityId;
    const hasHub = Boolean(renderHub);
    const automaticSave = isHub && offerResume && progress
        ? savedRuns.filter((saved) => saved.studentId === progress.studentId && progress.canResumeQuiz(saved.quiz.id))
            .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] ?? null : null;
    const resumeCandidate = selectedSave ?? automaticSave;
    const overlayOpen = Boolean(current) || Boolean(summary) || hubOverlayOpen || Boolean(leaveAction) || guideOpen || helpOpen || inventoryOpen || settingsOpen || Boolean(resumeCandidate);
    useLayoutEffect(() => { controller?.setKeyboardEnabled(!overlayOpen); }, [controller, overlayOpen, mapId]);

    const gameOptions = useMemo<GameOptions>(() => ({ initialQuiz, playerName, inventoryOwner: progress?.studentId, onEvent: handleEvent }),
        // The canvas boots once; travel/equipment changes use its controller.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []);
    const handleReady = useCallback((value: ActivityController) => { controllerRef.current = value; setController(value); }, []);
    const handleAnswer = useCallback((answer: AnswerValue) => controller?.answer(answer), [controller]);
    const finishQuestionExit = useCallback(() => {
        if (closeRequest === null) return;
        setCurrent(null); setReveal(null); setClosedReceipt(closeRequest); setCloseRequest(null);
    }, [closeRequest]);
    useEffect(() => {
        if (closedReceipt === null || current || !controller || acknowledgedClose.current === closedReceipt) return;
        acknowledgedClose.current = closedReceipt; controller.questionClosed(closedReceipt);
    }, [closedReceipt, current, controller]);
    const setEquipmentPickerOpen = useCallback((open: boolean) => controller?.setEquipmentPickerOpen(open), [controller]);

    const startRun = useCallback((quiz: PlayableQuiz, saved?: QuizCheckpoint) => {
        if (!controller) return;
        run.current = { id: saved?.runId ?? createId("run"), startedAt: saved?.startedAt ?? new Date().toISOString(), quiz, resumed: Boolean(saved) };
        completed.current = false; allowUnload.current = false; lastProgress.current = saved?.progress ?? null;
        setSaveError(null); setSelectedSave(null); setOfferResume(false); setActiveQuiz(quiz); pendingFreshQuiz.current = null;
        controller.startQuiz(quiz, saved?.progress);
    }, [controller]);
    const hubControls = useMemo<HubControls>(() => ({
        ready: ready && Boolean(controller) && !travelling && !resumeCandidate,
        startQuiz: (quiz) => {
            const saved = progress ? checkpointStore.get(checkpointId(progress.studentId, quiz.id)) : undefined;
            if (saved && progress?.canResumeQuiz(quiz.id)) { pendingFreshQuiz.current = quiz; setSelectedSave(saved); }
            else startRun(quiz);
        },
        setOverlayOpen: setHubOverlayOpen,
    }), [controller, ready, travelling, resumeCandidate, progress, startRun]);

    const restartQuiz = () => {
        if (!activeQuiz) return;
        run.current = { id: createId("run"), startedAt: new Date().toISOString(), quiz: activeQuiz, resumed: false };
        completed.current = false; allowUnload.current = false; lastProgress.current = null;
        resetActivityUi(); controller?.setKeyboardEnabled(true); controller?.restart();
    };
    const leave = (save: boolean) => {
        if (!leaveAction) return;
        if (save && !saveRun()) return;
        if (!save && progress && run.current) {
            try { removeCheckpoint(progress.studentId, run.current.quiz.id, run.current.id); }
            catch { setSaveError("The saved progress could not be removed. Try again before leaving."); return; }
        }
        allowUnload.current = true; completed.current = true; setLeaveAction(null);
        if (leaveAction === "reload") window.location.reload();
        else if (leaveAction === "hub") controller?.returnToHub();
        else exit.onExit();
    };
    const activity = getActivity(activityId ?? activeQuiz?.activityId ?? "fishing");
    const statusLine = activityId ? activity.copy.status[phase] : undefined;
    const leaveLabel = leaveAction === "reload" ? "reload" : leaveAction === "hub" ? "return to village" : "exit";

    return <div className="relative h-full w-full overflow-hidden bg-[#edf9fb]">
        <PhaserGame options={gameOptions} onReady={handleReady} />
        {!mapId && <div className="absolute inset-0"><WorldLoading progress={loading} /></div>}
        {ribbon && <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md bg-violet-600/90 px-3 py-1 font-pixel text-[9px] text-white shadow">{t(ribbon)}</div>}
        {isHub && !travelling && <>
            <div className="game-hub-header pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
                <div className="pointer-events-auto min-w-0">{badge}</div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                    <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setHelpOpen(true)}
                        className="pixel-btn min-h-11 rounded-lg bg-sky-700 px-2 py-2 font-pixel text-[9px] text-sky-50 sm:px-3">? {t("Help")}</button>
                    <GameSettingsButton onClick={() => setSettingsOpen(true)} />
                </div>
            </div>
            {!resumeCandidate && renderHub && <HubOverlay renderHub={renderHub} controls={hubControls} />}
        </>}
        {activityId && !travelling && <>
            <ActivityHud roomName={activeQuiz ? systemQuestText(activeQuiz.id, "name", activeQuiz.name, t) : t(activity.label)} questionNumber={hud.questionNumber} total={hud.total} caught={hud.caught} answered={hud.answered}
                scoreLabel={activity.copy.scoreLabel} misses={hud.misses} round={hud.round} rounds={hud.rounds} mode={hud.mode}
                actions={!summary && <div className="activity-menu flex max-w-40 flex-col items-end gap-2 sm:max-w-44">
                    <div className="flex items-center gap-2">
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setHelpOpen(true)} aria-label={t("Replay instructions")}
                            className="pixel-btn min-h-11 rounded-lg bg-sky-700 px-2 py-2 font-pixel text-[9px] text-sky-50 sm:px-3">? {t("Guide")}</button>
                        <GameSettingsButton onClick={() => setSettingsOpen(true)} />
                    </div>
                    <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setLeaveAction(hasHub ? "hub" : "exit")}
                        className="pixel-btn max-w-full rounded-lg bg-slate-800 px-2 py-2 font-pixel text-[9px] leading-relaxed text-slate-100">{progress ? t("Save / exit") : t(exit.label)}</button>
                    {saveError && <span role="status" className="max-w-full rounded bg-rose-950 p-2 text-xs text-rose-100">{t("Progress not saved")}</span>}
                </div>} />
        </>}
        {prompt && !summary && !current && !travelling && <div className="equipment-prompt pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3">
            <div className="lw-pop-in pixel-panel world-hud-panel max-w-[92vw] rounded-lg bg-slate-900 px-4 py-2 text-center text-sm text-amber-200">{t(prompt)}</div>
        </div>}
        {statusLine && !summary && !current && <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
            <span className="font-pixel world-hud-panel rounded px-3 py-1 text-[10px] text-sky-200">{t(statusLine)}</span>
        </div>}
        {activityId && current && !summary && <QuestionCard key={`${current.questionNumber}-${current.question.id}`} cue={activity.copy.questionCue} shortAnswerHint={activity.copy.shortAnswerHint} feedbackCopy={activity.copy.answerFeedback}
            question={current.question} questionNumber={current.questionNumber} total={current.total} reveal={reveal} closing={closeRequest !== null}
            onExited={finishQuestionExit} celebrate={activityId === "fishing"} suspended={Boolean(leaveAction) || helpOpen || guideOpen || settingsOpen} onAnswer={handleAnswer} />}
        <TouchControls controller={controller} hidden={!mapId || overlayOpen || travelling} action={{ label: t(equipment.equipped === "rod" && phase === "waiting" ? activity.copy.waitingActionLabel : EQUIPMENT[equipment.equipped].actionLabel),
            enabled: equipment.actionEnabled, onPress: () => controller?.primaryAction() }} />
        {mapId && !overlayOpen && !travelling && <>
            <EquipmentPicker key={`${mapId}-${equipment.locked}`} state={equipment} onEquip={(id) => controller?.equip(id)} onOpenChange={setEquipmentPickerOpen} />
        </>}
        {mapId && !travelling && !summary && <InventoryPanel items={items} open={inventoryOpen} onOpenChange={setInventoryOpen}
            visible={!overlayOpen || inventoryOpen} />}
        {summary && <ResultsScreen summary={summary} note={completionSaveFailed ? undefined : resultsNote}
            saveError={completionSaveFailed ? { retry: persistCompletion } : undefined}
            primary={hasHub ? { label: "🏡 BACK TO VILLAGE", onClick: () => controller?.returnToHub() } : { label: "▶ PLAY AGAIN", onClick: restartQuiz }}
            secondary={hasHub ? { label: activity.copy.playAgainLabel, onClick: restartQuiz } : { label: exit.label, onClick: exit.onExit }} />}
        <GameSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} suspended={Boolean(leaveAction)}
            music={music} onMusicChange={enabled => controller?.setMusicEnabled(enabled)} />
        <ActivityGuideDialog activity={activity} open={guideOpen} suspended={Boolean(leaveAction) || settingsOpen} onClose={() => setGuideOpen(false)} />
        <GameHelp open={helpOpen} suspended={Boolean(leaveAction) || settingsOpen} onClose={() => setHelpOpen(false)} activity={activityId ? activity : undefined} />
        <Modal open={Boolean(leaveAction)} title={t("Pause your quest?")} onClose={() => setLeaveAction(null)} footer={<>
            <PixelButton tone="slate" onClick={() => setLeaveAction(null)}>{t("Keep playing")}</PixelButton>
            <PixelButton tone="rose" onClick={() => leave(false)}>{t("Leave without saving")}</PixelButton>
            {progress && <PixelButton tone="emerald" onClick={() => leave(true)}>{t(`Save & ${leaveLabel}`)}</PixelButton>}
        </>}>
            <p className="text-sm leading-relaxed text-slate-200">{t(progress
                ? "Your answers and practice misses can be resumed on this browser. Unfinished actions restart safely; answered questions stay answered."
                : "This is a preview. Leaving or reloading starts it over; no student result is recorded.")}</p>
            {progress && <button type="button" className="mt-4 rounded-lg border border-sky-500 px-3 py-2 text-sm font-bold text-sky-300" onClick={() => { if (saveRun()) setLeaveAction(null); }}>{t("Save & keep playing")}</button>}
            {saveError && <p role="alert" className="mt-3 text-sm text-rose-300">{t(saveError)}</p>}
        </Modal>
        <Modal open={Boolean(resumeCandidate) && isHub && ready && !travelling} title={t("Continue your saved quest?")} onClose={() => { setSelectedSave(null); setOfferResume(false); }}
            footer={<>
                <PixelButton tone="slate" onClick={() => { setSelectedSave(null); setOfferResume(false); }}>{t("Not now")}</PixelButton>
                <PixelButton tone="slate" onClick={() => {
                    if (!resumeCandidate || !progress) return;
                    const fresh = pendingFreshQuiz.current ?? progress.buildQuiz(resumeCandidate.quiz.id);
                    if (!fresh) return;
                    try { removeCheckpoint(progress.studentId, fresh.id); startRun(fresh); }
                    catch { setSaveError("The saved progress could not be removed. Try again before leaving."); }
                }}>{t("Start over")}</PixelButton>
                <PixelButton tone="emerald" onClick={() => { if (resumeCandidate && progress?.canResumeQuiz(resumeCandidate.quiz.id)) startRun(resumeCandidate.quiz, resumeCandidate); }}>{t("Resume")}</PixelButton>
            </>}>
            {resumeCandidate && <div className="space-y-2 text-sm text-slate-200"><p className="font-bold text-amber-200">{systemQuestText(resumeCandidate.quiz.id, "name", resumeCandidate.quiz.name, t)}</p>
                <p>{t("{answered} of {total} questions completed", { answered: resumeCandidate.progress.quiz.answers.length, total: resumeCandidate.quiz.questions.length })}</p>
                <p className="text-xs text-slate-400">{t("Saved on this browser. Question order and previous answers will be preserved.")}</p>
                {saveError && <p role="alert" className="text-rose-300">{t(saveError)}</p>}
            </div>}
        </Modal>
    </div>;
}

/** The hub receives callback handles, never reads the mutable run refs during render. */
function HubOverlay({ renderHub, controls }: { renderHub: NonNullable<GameScreenProps["renderHub"]>; controls: HubControls }) {
    return renderHub(controls);
}
