import { SkeletonPage } from "@/components/skeleton/page";

export default function Loading() {
  return <SkeletonPage variant="cards" columns={6} statusTabs />;
}
