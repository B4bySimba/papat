"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Lock, Unlock, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SkeletonPage } from "@/components/skeleton/page";
import { useAccess } from "@/components/AccessProvider";
import { adminApi, Catalog, PersonDetail, ROLE_LABEL, when } from "./api";
import { StatusBadge } from "./PeopleList";
import { Access, RightsEditor } from "./RightsEditor";
import { TempPasswordDialog } from "./TempPasswordDialog";

const accessOf = (p: PersonDetail): Access => ({ rights: p.rights, houses: Object.fromEntries(p.houses.map((h) => [h.id, h.rights])) });
const same = (a: Access, b: Access) =>
  JSON.stringify([[...a.rights].sort(), Object.entries(a.houses).map(([k, v]) => [k, [...v].sort()]).sort()]) ===
  JSON.stringify([[...b.rights].sort(), Object.entries(b.houses).map(([k, v]) => [k, [...v].sort()]).sort()]);

export default function PersonPage({ userId }: { userId: string }) {
  const { isRoot } = useAccess();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);
  const [access, setAccess] = useState<Access>({ rights: [], houses: {} });
  const [profile, setProfile] = useState({ name: "", role: "AGENT" });
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);

  const show = useCallback((p: PersonDetail) => {
    setPerson(p);
    setAccess(accessOf(p));
    setProfile({ name: p.name ?? "", role: p.role });
  }, []);

  useEffect(() => {
    Promise.all([adminApi<PersonDetail>(`users/${userId}`), adminApi<Catalog>("catalog"), fetch("/api/properties/names").then((r) => r.json() as Promise<{ id: string; name: string }[]>)])
      .then(([p, c, all]) => {
        show(p);
        setCatalog(c);
        // Root picks from every house; an admin only reads, so the person's own houses are enough.
        setHouses(
          (isRoot ? all : p.houses).map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch((e) => toast.error(e.message));
  }, [userId, isRoot, show]);

  const dirty = useMemo(() => !!person && !same(access, accessOf(person)), [access, person]);

  if (!person || !catalog) return <SkeletonPage variant="cards" columns={3} />;

  const editable = isRoot && person.role !== "ROOT";
  // Admins act on agents only; nobody acts on root.
  const canManage = person.role !== "ROOT" && (isRoot || person.role === "AGENT");

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(done);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveAccess = () =>
    run(
      async () =>
        show(
          await adminApi<PersonDetail>(`users/${userId}/access`, "PUT", {
            rights: access.rights,
            houses: Object.entries(access.houses).map(([id, rights]) => ({ id, rights })),
          }),
        ),
      "Rights saved. They apply from their next click.",
    );
  // These leave any unsaved rights edits alone.
  const saveProfile = () => run(async () => setPerson(await adminApi<PersonDetail>(`users/${userId}`, "PATCH", profile)), "Saved.");
  const resetPassword = () =>
    run(
      async () => setTemp((await adminApi<{ tempPassword: string }>(`users/${userId}/reset-password`, "POST")).tempPassword),
      "Password reset. They have been logged out.",
    );
  const suspend = (suspended: boolean) =>
    run(
      async () => setPerson(await adminApi<PersonDetail>(`users/${userId}/suspend`, "POST", { suspended })),
      suspended ? "Suspended. They have been logged out." : "They can log in again.",
    );
  const unlock = () => run(async () => setPerson(await adminApi<PersonDetail>(`users/${userId}/unlock`, "POST")), "Unlocked.");

  return (
    <div className="w-full pb-24">
      <div className="mb-5 flex items-center gap-3 sm:mb-8">
        <Button asChild variant="outline" size="icon" className="size-8 shrink-0 rounded-full">
          <Link href="/admin" aria-label="Back to people">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{person.name || person.username}</h1>
          <p className="text-sm text-muted-foreground">
            {person.username} · {ROLE_LABEL[person.role]} · last login {when(person.lastLoginAt)}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge person={person} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {editable && (
          <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold">Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={profile.role} onValueChange={(role) => setProfile({ ...profile, role })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              disabled={busy || (profile.name === (person.name ?? "") && profile.role === person.role)}
              onClick={saveProfile}
            >
              Save details
            </Button>
          </section>
        )}

        {canManage && (
          <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold">Account</h3>
            <div className="flex flex-wrap gap-2">
              <Confirm
                trigger={
                  <Button variant="outline" size="sm" disabled={busy}>
                    <KeyRound />
                    Reset password
                  </Button>
                }
                title={`Reset ${person.username}'s password?`}
                body="They are logged out at once and get a temporary password to change on their next login."
                confirm="Reset password"
                onConfirm={resetPassword}
              />
              {person.suspended ? (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => suspend(false)}>
                  <UserCheck />
                  Unsuspend
                </Button>
              ) : (
                <Confirm
                  trigger={
                    <Button variant="outline" size="sm" disabled={busy} className="text-red-600">
                      <UserX />
                      Suspend
                    </Button>
                  }
                  title={`Suspend ${person.username}?`}
                  body="They are logged out at once and can't log in until unsuspended. Their rights stay as they are."
                  confirm="Suspend"
                  onConfirm={() => suspend(true)}
                />
              )}
              {isRoot && person.locked && (
                <Button variant="outline" size="sm" disabled={busy} onClick={unlock}>
                  <Unlock />
                  Unlock
                </Button>
              )}
            </div>
            {person.locked && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700">
                <Lock className="size-3.5" />
                Locked for 15 minutes after 5 wrong passwords.
              </p>
            )}
          </section>
        )}
      </div>

      {person.role === "ROOT" ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Root can see and do everything, in every house.</p>
      ) : (
        <RightsEditor catalog={catalog} houses={houses} value={access} onChange={setAccess} readOnly={!editable} />
      )}

      {editable && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:left-auto md:right-6 md:bottom-6 md:rounded-xl md:border md:shadow-lg">
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto text-sm text-muted-foreground md:mr-4">Unsaved changes</span>
            <Button variant="outline" onClick={() => setAccess(accessOf(person))} disabled={busy}>
              Discard
            </Button>
            <Button onClick={saveAccess} disabled={busy}>
              {busy ? "Saving..." : "Save rights"}
            </Button>
          </div>
        </div>
      )}

      <TempPasswordDialog shown={temp ? { username: person.username, password: temp } : null} onClose={() => setTemp(null)} />
    </div>
  );
}

function Confirm({
  trigger,
  title,
  body,
  confirm,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
