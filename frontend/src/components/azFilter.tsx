export default function AZFilter({
  onSelect,
  selected,
}: {
  onSelect: (char: string) => void;
  selected: string | null;
}) {
  const letters = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <div className="-mx-3 flex gap-1 overflow-x-auto px-3 py-1 scrollbar-none md:fixed md:right-4 md:z-20 md:mx-0 md:flex-col md:items-center md:gap-0 md:space-y-1 md:overflow-visible md:p-2 md:bg-white/80 md:rounded-xl md:shadow-md md:backdrop-blur-sm md:border md:border-gray-200">
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => onSelect(letter)}
          className={`size-8 shrink-0 text-xs font-semibold flex items-center justify-center rounded-full border transition-colors md:size-6 md:border-0
              ${
                selected === letter
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background hover:bg-gray-200 text-gray-600 md:bg-transparent"
              }`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
