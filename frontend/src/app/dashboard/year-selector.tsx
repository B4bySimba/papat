import YearSelectorComponent from "@/components/YearSelector";
import { useEffect, useState } from "react";

interface Props {
  year: string;
  setYear: (year: string) => void;
  years: number[];
}

export default function YearSelector({ year, setYear, years }: Props) {
  return (
    <YearSelectorComponent
      years={years}
      selectedYear={year}
      onYearChange={setYear}
    />
  );
}
