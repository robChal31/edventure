import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LocaleProvider } from "@/i18n/provider";

const pixelFont = localFont({
    src: "../../public/assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf",
    variable: "--font-pixel",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Learning World",
    description:
        "Schools build quizzes from a shared question bank. Students play them through interactive activity maps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="id" className={`${pixelFont.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col"><LocaleProvider>{children}</LocaleProvider></body>
        </html>
    );
}
