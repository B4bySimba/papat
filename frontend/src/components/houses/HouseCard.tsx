interface HouseCardProps {
  name: string;
  id: string;
}

export default function HouseCard({ name }: HouseCardProps) {
  return (
    <div className="p-2 bg-white shadow shadow-accent-foreground rounded-xl border hover:shadow-md transition cursor-pointer">
      <p className="text-lg font-semibold">{name}</p>
    </div>
  );
}
