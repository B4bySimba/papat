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
    <div className="fixed right-4 flex flex-col items-center space-y-1 p-2 bg-white/80 rounded-lg shadow-md backdrop-blur-sm border border-gray-200">
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => onSelect(letter)}
          className={`w-6 h-6 text-xs font-semibold flex items-center justify-center rounded-full transition-colors
              ${
                selected === letter
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
