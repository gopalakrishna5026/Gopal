import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppProvider } from "@/providers/app-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RailYatra — Train Ticket Booking (Simulation)",
    template: "%s · RailYatra",
  },
  description:
    "A frontend-only, IRCTC-inspired train ticket booking simulation built with Next.js, Zustand and IndexedDB. No real tickets or payments.",
};

export const viewport: Viewport = {
  themeColor: "#173B70",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
