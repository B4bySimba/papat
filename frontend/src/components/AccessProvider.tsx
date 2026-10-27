"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

/** What GET /auth/me answers: who is signed in, their global rights and their rights per house. */
export type Me = {
  username: string;
  name: string | null;
  role: "ROOT" | "ADMIN" | "AGENT";
  mustChangePassword: boolean;
  rights: string[];
  houses: { id: string; name: string; rights: string[] }[];
};

const AccessContext = createContext<Me | null>(null);

export function AccessProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const pathname = usePathname();

  // A password reset by someone else leaves a temporary password: nothing works until it is changed.
  useEffect(() => {
    if (me?.mustChangePassword && pathname !== "/change-password") window.location.replace("/change-password");
  }, [me, pathname]);

  return <AccessContext.Provider value={me}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const me = useContext(AccessContext);
  return useMemo(() => {
    const isRoot = me?.role === "ROOT";
    const byHouse = new Map((me?.houses ?? []).map((h) => [h.id, new Set(h.rights)]));
    return {
      me,
      isRoot,
      isAdmin: isRoot || me?.role === "ADMIN",
      /** A right at one house; with no house, a global right or one held at any house. */
      can(right: string, houseId?: string | null) {
        if (isRoot) return true;
        if (houseId) return !!byHouse.get(houseId)?.has(right);
        return !!me?.rights.includes(right) || [...byHouse.values()].some((rights) => rights.has(right));
      },
      /** Ids of the houses where `right` is held; null means every house (root). */
      houses(right: string): Set<string> | null {
        if (isRoot) return null;
        return new Set((me?.houses ?? []).filter((h) => h.rights.includes(right)).map((h) => h.id));
      },
    };
  }, [me]);
}
