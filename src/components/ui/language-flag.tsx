/** SVG flags stay visible on devices/fonts without regional-indicator emoji support. */
export default function LanguageFlag({ locale }: { locale: "id" | "en" }) {
    return <svg viewBox="0 0 60 40" className="language-flag" data-language-flag={locale} aria-hidden="true" focusable="false">
        {locale === "id" ? <><path fill="#fff" d="M0 0h60v40H0z" /><path fill="#e43b44" d="M0 0h60v20H0z" /></> : <>
            <path fill="#173b79" d="M0 0h60v40H0z" />
            <path stroke="#fff" strokeWidth="9" d="m0 0 60 40m0-40L0 40" />
            <path stroke="#dc3547" strokeWidth="3" d="m0 0 60 40m0-40L0 40" />
            <path stroke="#fff" strokeWidth="14" d="M30 0v40M0 20h60" />
            <path stroke="#dc3547" strokeWidth="8" d="M30 0v40M0 20h60" />
        </>}
    </svg>;
}
