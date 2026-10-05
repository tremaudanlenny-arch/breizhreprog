import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { Toaster } from "@/components/ui/toaster";
import { LocalBridge } from "@/components/local-bridge";
import { AppBootstrap } from "@/components/app-bootstrap";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Breizh Reprog X Ninnin",
  description: "Breizh Reprog X Ninnin - ECU map editor (Bosch EDC15/EDC16)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <LocalBridge>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <SettingsProvider>
              <I18nProvider>
                {children}
                <AppBootstrap />
                <Toaster />
              </I18nProvider>
            </SettingsProvider>
          </ThemeProvider>
        </LocalBridge>
      </body>
    </html>
  );
}