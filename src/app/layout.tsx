import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Juntaditas",
  description: "Organizá tus juntadas con amigos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${geist.className} min-h-full flex flex-col bg-background`}>
        {children}
      </body>
    </html>
  );
}
