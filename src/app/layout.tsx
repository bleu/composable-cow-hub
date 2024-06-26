"use client"
import "./globals.css";

import { cn } from "@bleu-fi/ui";
import localFont from "next/font/local";

import { RootLayout } from "#/components/RootLayout";


const flechaS = localFont({
  src: [
    {
      path: "../fonts/FlechaS-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/FlechaS-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
  ],
  variable: "--font-family-serif",
});

const circularStd = localFont({
  src: [
    {
      path: "../fonts/CircularStd-Book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/CircularStd-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-family-sans",
});

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          flechaS.variable,
          circularStd.variable,
          "bg-background flex h-full flex-col font-sans font-normal text-foreground border-foreground"
        )}
      >
        <RootLayout>{children}</RootLayout>
      </body>
    </html>
  );
}
