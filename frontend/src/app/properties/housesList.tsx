"use client";

import { useEffect, useRef, useState } from "react";
import { SkeletonHouseList } from "@/components/skeleton/houseList";
import AZFilter from "@/components/azFilter";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    return <p className="text-center text-gray-500">No properties found.</p>;

  const filteredHouses = houses.filter((house) =>
    house.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div onClick={() => selectedLetter && setSelectedLetter(null)}>
      {/* --- Search & Filter Header --- */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-center mb-6">
        <div>
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

        <div className="flex gap-2 items-center w-full md:w-auto">
          <Input
            placeholder="Search house by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-100"
          />
          <Button variant="secondary" className="px-3">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* --- Grid of Houses --- */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
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
