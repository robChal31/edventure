import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pixelFont = localFont({
    src: "../../public/assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf",
    variable: "--font-pixel",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Learning World",
    description:
        "Teachers create quizzes. Students play them through interactive game activities — starting with Fishing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className={`${pixelFont.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}
