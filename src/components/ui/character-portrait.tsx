import Image from "next/image";

/** Exact first front-idle frame of the playable Josh export, not the old fish avatar. */
export default function CharacterPortrait({ size = 40 }: { size?: number }) {
    return <span className="character-portrait" style={{ width: size, height: size }} aria-hidden>
        <Image src="/assets/images/ui/josh-portrait.png" alt="" width={32} height={32} unoptimized
            className="h-full w-full object-contain [image-rendering:pixelated]" />
    </span>;
}
