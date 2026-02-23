import type { Metadata, Viewport } from "next";
import "./globals.css"; // Global styles

export const metadata: Metadata = {
  title: "Mainframe Mentor",
  description:
    "AI assistant for mainframe developers (TANDEM, COBOL, GUARDIAN 90).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="overscroll-none bg-zinc-950 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
