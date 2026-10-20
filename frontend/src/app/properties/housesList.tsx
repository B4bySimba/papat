"use client";

import { useEffect, useRef, useState } from "react";
import { SkeletonHouseList } from "@/components/skeleton/houseList";
import AZFilter from "@/components/azFilter";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import HouseCard from "@/components/houses/HouseCard";

export default function HousesList() {
  const [houses, setHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const houseRefs = useRef<{
    [key: string]: HTMLDivElement | HTMLAnchorElement | null;
  }>({});

  useEffect(() => {
    fetch("/api/properties/names")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setHouses)
      .catch((err) => {
        console.error("Failed to fetch house names", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);
  

  if (loading) return <SkeletonHouseList />;
  if (error || houses.length === 0)
    return (
      <div className="rounded-xl border border-dashed bg-card py-16 text-center text-sm text-muted-foreground">
        No properties found.
      </div>
    );

  const filteredHouses = houses.filter((house) =>
    house.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div onClick={() => selectedLetter && setSelectedLetter(null)}>
      {/* --- Search & Filter Header --- */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-center md:gap-4">
        <div className="min-w-0">
          <AZFilter
            selected={selectedLetter}
            onSelect={(char) => {
              setSelectedLetter(char);
              houseRefs.current[char]?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
          />
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search house by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full bg-background pl-9 md:w-100"
          />
        </div>
      </div>

      {/* --- Grid of Houses --- */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3 md:pr-14">
        {filteredHouses.map((house) => {
          const firstChar = house.name.charAt(0).toUpperCase();
          const matches =
            (!selectedLetter || selectedLetter === firstChar) &&
            house.name.toLowerCase().includes(searchTerm.toLowerCase());

            return (
              <div
                key={house.id}
                ref={(el) => {
                  const firstChar = house.name.charAt(0).toUpperCase();
                  if (!houseRefs.current[firstChar]) {
                    houseRefs.current[firstChar] = el;
                  }
                }}
              >
                <Link
                  href={`/properties/${house.id}`}
                  className={`transition-all duration-300 block ${
                    !matches
                      ? "relative blur-sm opacity-30 cursor-pointer"
                      : "animate-fade-in"
                  }`}
                  onClick={(e) => {
                    if (!matches) setSelectedLetter(null);
                    e.stopPropagation();
                  }}
                >
                  <HouseCard name={house.name} id={house.id} />
                  {!matches && <div className="absolute inset-0 z-10" />}
                </Link>
              </div>
            );
                    })}
      </div>
    </div>
  );
}
