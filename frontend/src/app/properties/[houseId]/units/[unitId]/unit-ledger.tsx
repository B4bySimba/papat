import Ledger from "@/components/charts/ledger";
import { SkeletonChart } from "@/components/skeleton/chart";
import React from "react";

interface Props {
  data: any[];
  year: string;
  noData?: boolean;
}

export default function UnitLedger({ data, year, noData }: Props) {
  if (noData) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No ledger data available for {year}
      </div>
    );
  }

  return <Ledger data={data} year={year} />;
}
