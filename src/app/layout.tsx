import type { Metadata } from "next";

import { APP_NAME } from "@/config/brand";
import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: "A chat application with conversations saved on your account.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
