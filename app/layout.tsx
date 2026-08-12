import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Show HN volume surged; 20-point posts barely moved — OrangeCrumbs";
const description =
  "Show HN submissions peaked at 6.3× their ChatGPT-launch level, while posts reaching 20 points grew far less.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3002";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og-v2.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: [{ url: imageUrl, width: 1731, height: 909 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
