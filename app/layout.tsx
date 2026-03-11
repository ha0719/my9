import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Script from 'next/script';
import "./globals.css";

const ENABLE_VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1";
const ENABLE_VERCEL_SPEED_INSIGHTS = process.env.NEXT_PUBLIC_ENABLE_VERCEL_SPEED_INSIGHTS === "1";

export const metadata: Metadata = {
  metadataBase: new URL("https://my9.baozangapp.com"),
  title: "构成我的九部作品",
  description: "挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部作品」页面。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "构成我的九部作品",
    description: "挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部作品」页面。",
    url: "/",
    siteName: "构成我的九部作品",
  },
  twitter: {
    card: "summary_large_image",
    title: "构成我的九部作品",
    description: "挑选 9 部最能代表你的作品，生成并分享你的「构成我的九部作品」页面。",
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
        {/* ================= 添加百度统计 ================= */}
        <Script id="baidu-tongji" strategy="afterInteractive">
          {`
            var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              // 将下面链接里的 YOUR_BAIDU_ID 换成你自己的百度统计特征码
              hm.src = "https://hm.baidu.com/hm.js?7a71dce60cae4de0b75f9c4fe45e2a6c";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })();
          `}
        </Script>

        {/* ================= 添加谷歌广告 AdSense ================= */}
        {/* 将下面的 YOUR_ADSENSE_ID 换成你自己的 ca-pub-xxxxxx */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6579450190100468"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
