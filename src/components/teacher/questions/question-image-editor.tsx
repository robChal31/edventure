"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { QuestionImage } from "@/quiz/types";
import { prepareQuestionImage } from "@/quiz/question-image";
import { useI18n } from "@/i18n/provider";
import { inputClass } from "@/components/ui/panels";

export default function QuestionImageEditor({ image, onChange, onBusyChange }: {
    image?: QuestionImage;
    onChange: (image: QuestionImage | undefined) => void;
    onBusyChange?: (busy: boolean) => void;
}) {
    const { t } = useI18n();
    const input = useRef<HTMLInputElement>(null);
    const request = useRef(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => () => { request.current += 1; }, []);
    const markBusy = (value: boolean) => { setBusy(value); onBusyChange?.(value); };
    return <fieldset className="rounded-xl border-2 border-dashed border-slate-600 p-3">
        <legend className="px-1 text-xs font-semibold">{t("Question image (optional)")}</legend>
        <p className="mb-3 text-xs text-slate-400">{t("PNG, JPG or WebP, up to 5 MB. Images are resized and saved on this device.")}</p>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={t("Insert image")}
            onChange={async (event) => {
                const file = event.target.files?.[0]; if (!file) return;
                const id = ++request.current; markBusy(true); setError("");
                try {
                    const prepared = await prepareQuestionImage(file);
                    if (id === request.current) onChange(prepared);
                } catch (error) { if (id === request.current) setError(error instanceof Error ? error.message : "This image could not be opened."); }
                finally { if (id === request.current) markBusy(false); if (input.current) input.current.value = ""; }
            }} />
        {image && <div className="mb-3 rounded-lg bg-white/90 p-2">
            <Image src={image.src} alt={image.alt || t("Question image preview")} width={image.width} height={image.height}
                unoptimized className="mx-auto max-h-48 w-auto max-w-full rounded object-contain" />
        </div>}
        <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => input.current?.click()}
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? t("Preparing image…") : image ? t("Replace image") : t("Insert image")}</button>
            {(image || busy) && <button type="button" onClick={() => { request.current += 1; markBusy(false); setError(""); onChange(undefined); }}
                className="rounded-lg border border-rose-400 px-3 py-2 text-xs font-bold text-rose-400">{t("Remove image")}</button>}
        </div>
        {image && <label className="mt-3 flex flex-col gap-1 text-xs">
            <span>{t("Image description (required)")}</span>
            <input value={image.alt} maxLength={500} onChange={(event) => onChange({ ...image, alt: event.target.value })}
                placeholder={t("Describe what students need to see.")} className={inputClass} />
        </label>}
        {error && <p role="alert" className="mt-2 text-xs text-rose-400">{t(error)}</p>}
    </fieldset>;
}
