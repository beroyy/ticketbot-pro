import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { SSEProvider } from "@/components/providers/sse-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TicketsBot - Support Dashboard",
  description: "Manage your support tickets efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SSEProvider>
          <QueryProvider>
            <DialogProvider>
              {children}
            </DialogProvider>
          </QueryProvider>
        </SSEProvider>
        <Toaster />
      </body>
    </html>
  );
}
