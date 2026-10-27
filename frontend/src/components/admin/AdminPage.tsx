"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeopleList from "./PeopleList";
import ActivityLog from "./ActivityLog";

export default function AdminPage() {
  const [tab, setTab] = useState<"people" | "activity">("people");
  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Admin</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-10 rounded-full bg-muted p-1">
            <TabsTrigger value="people" className="rounded-full px-4">
              People
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-full px-4">
              Activity log
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "people" ? <PeopleList /> : <ActivityLog />}
    </div>
  );
}
