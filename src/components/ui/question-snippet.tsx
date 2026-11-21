import Image from "next/image";
import type { Question } from "@/quiz/types";

/** Identify image-only questions in banks, quiz pickers and report summaries, too. */
export default function QuestionSnippet({ question, compact = false, className = "" }: {
    question: Pick<Question, "text" | "image">;
    compact?: boolean;
    className?: string;
}) {
    const label = question.text || question.image?.alt;
    return <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        {question.image && <Image src={question.image.src} alt={question.image.alt}
            width={question.image.width} height={question.image.height} unoptimized
            className={`shrink-0 rounded border border-slate-500/25 bg-white object-contain ${compact ? "h-8 w-10" : "h-14 w-16"}`} />}
        <span className={compact ? "min-w-0 truncate" : "min-w-0 break-words"} title={label}>{label}</span>
    </div>;
}
