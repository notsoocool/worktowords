import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/navbar";
import { ClerkProviderWrapper } from "@/app/clerk-provider";
import { AppToaster } from "@/components/app-toaster";
import { AppThemeProvider } from "@/app/theme-provider";
import { ThemeRippleToggle } from "@/components/theme-ripple-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorktoWords",
  description: "Turn your daily work into LinkedIn posts.",
  icons: {
    icon: "/worktowordslogo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <AppThemeProvider>
          <ClerkProviderWrapper>
            <Navbar />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <Footer />
            <AppToaster />
            <ThemeRippleToggle />
          </ClerkProviderWrapper>
        </AppThemeProvider>
      </body>
    </html>
  );
}
