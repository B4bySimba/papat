// import "@/styles/globals.css";
import ClientAppLayout from "@/components/clientAppLayout";
import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { GlobalUnitEditSheet } from "@/components/GlobalUnitSheetEditor";

export const metadata: Metadata = {
  title: "Papat Properties Limited",
  description: "Manage properties, tenants, and payments with ease.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden h-full">
      <body className="h-full w-full overflow-hidden bg-gray-50 text-gray-900">
        <ClientAppLayout>{children}</ClientAppLayout>
        <Toaster richColors />
        <GlobalUnitEditSheet />
      </body>
    </html>
  );
}
