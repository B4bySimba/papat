export default function StatusBadge({
  status,
}: {
  status: "PAID" | "OVERDUE";
}) {
  const color = status === "PAID" ? "bg-green-500" : "bg-red-500";

  return (
    <span className={`text-white px-2 py-1 rounded text-sm ${color}`}>
      {status}
    </span>
  );
}
