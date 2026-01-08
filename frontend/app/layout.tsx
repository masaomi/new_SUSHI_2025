import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github.css";
import "handsontable/styles/handsontable.min.css"
import { AuthProvider } from "@/providers/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import Header from "@/components/shared/Header";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sushi App",
  description: "SUSHI - produced by Functional Genomics Center Zurich and SIB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        style={{ backgroundColor: '#e0e5e9' }}
      >
        <QueryProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="py-4 mt-auto" style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <div className="container mx-auto px-6 text-center text-sm">
                  SUSHI - produced by Functional Genomics Center Zurich and SIB
                </div>
              </footer>
            </div>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

