import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { SSEProvider } from "@/components/providers/sse-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${inter.variable} antialiased`}>
        <SSEProvider>
          <QueryProvider>
            <DialogProvider>{children}</DialogProvider>
          </QueryProvider>
        </SSEProvider>
        <Toaster />
      </body>
    </html>
  );
}
