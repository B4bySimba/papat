import { ChevronRight } from "lucide-react";

interface HouseCardProps {
  name: string;
  id: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export default function HouseCard({ name }: HouseCardProps) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.99] cursor-pointer">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
        {initials(name)}
      </span>
      <p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>
  );
}
