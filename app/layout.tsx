import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const ENABLE_VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1";
const ENABLE_VERCEL_SPEED_INSIGHTS = process.env.NEXT_PUBLIC_ENABLE_VERCEL_SPEED_INSIGHTS === "1";

export const metadata: Metadata = {
  metadataBase: new URL("https://my9.shatranj.space"),
  title: "构成我的九部",
  description: "用 Bangumi 搜索挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部」页面。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "构成我的九部",
    description: "用 Bangumi 搜索挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部」页面。",
    url: "/",
    siteName: "构成我的九部",
  },
  twitter: {
    card: "summary_large_image",
    title: "构成我的九部",
    description: "用 Bangumi 搜索挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部」页面。",
  },
  verification: {
    google: "swtOMxSQC6Dfn-w4YtMQ3OFH4SZz00Blcd6FI0qMgJc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <GoogleAnalytics />
      </head>
      <body>
        {ENABLE_VERCEL_ANALYTICS ? <Analytics /> : null}
        {ENABLE_VERCEL_SPEED_INSIGHTS ? <SpeedInsights /> : null}
        {children}
      </body>
    </html>
  );
}
