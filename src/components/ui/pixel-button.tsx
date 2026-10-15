import type { ButtonHTMLAttributes } from "react";

export type ButtonTone = "amber" | "emerald" | "sky" | "rose" | "slate" | "violet";
export type ButtonSize = "sm" | "md" | "lg";

const TONES: Record<ButtonTone, string> = {
    amber: "bg-amber-400 text-amber-950 hover:bg-amber-300",
    emerald: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400",
    sky: "bg-sky-500 text-sky-950 hover:bg-sky-400",
    rose: "bg-rose-600 text-rose-50 hover:bg-rose-500",
    slate: "bg-slate-600 text-slate-50 hover:bg-slate-500",
    violet: "bg-violet-500 text-violet-950 hover:bg-violet-400",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2.5 text-xs",
    lg: "px-6 py-4 text-sm",
};

/** Class string for pixel-style buttons (also usable on <Link>). */
export function pixelButtonClass(
    tone: ButtonTone = "amber",
    size: ButtonSize = "md",
    extra = ""
): string {
    return `pixel-btn inline-flex items-center justify-center gap-2 rounded-lg font-pixel disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${SIZES[size]} ${extra}`;
}

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: ButtonTone;
    size?: ButtonSize;
};

export default function PixelButton({
    tone = "amber",
    size = "md",
    className = "",
    type = "button",
    ...props
}: PixelButtonProps) {
    return (
        <button
            type={type}
            className={pixelButtonClass(tone, size, className)}
            {...props}
        />
    );
}
