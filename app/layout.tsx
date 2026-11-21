import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VILABULB — Make your moment shine",
  description: "Discover videos, share your creativity and connect with people on VILABULB.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
