import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Connect Monitor · 콘텐츠 모니터링",description:"네이버 커넥트 관련 블로그 콘텐츠를 수집하고 경쟁사 콘텐츠 트렌드를 분석하는 업무 대시보드",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>;}
