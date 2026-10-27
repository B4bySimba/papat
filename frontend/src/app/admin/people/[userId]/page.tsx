import { notFound } from "next/navigation";
import PersonPage from "@/components/admin/PersonPage";
import { fetchMe } from "@/lib/backend";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const me = await fetchMe();
  if (me?.role !== "ROOT" && me?.role !== "ADMIN") notFound();
  return <PersonPage userId={(await params).userId} />;
}
