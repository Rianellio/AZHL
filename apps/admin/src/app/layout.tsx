import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AZHL Admin",
  description: "AZHL league administration — arrives in Phase 4.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
