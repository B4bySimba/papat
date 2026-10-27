import { notFound } from "next/navigation";
import AdminPage from "@/components/admin/AdminPage";
import { fetchMe } from "@/lib/backend";

export default async function Page() {
  const me = await fetchMe();
  if (me?.role !== "ROOT" && me?.role !== "ADMIN") notFound();
  return <AdminPage />;
}
