"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { SkeletonPage } from "@/components/skeleton/page";
import { useAccess } from "@/components/AccessProvider";
import { adminApi, Person, ROLE_LABEL, statusOf, when } from "./api";
import { TempPasswordDialog } from "./TempPasswordDialog";

export function StatusBadge({ person }: { person: Person }) {
  const { label, tone } = statusOf(person);
  return <Badge className={`border-0 ring-1 ring-inset ${tone}`}>{label}</Badge>;
}

const columns: DataTableProps<Person>["columns"] = [
  { key: "name", label: "Name", render: (v: string | null, p) => v || p.username },
  { key: "username", label: "Username" },
  { key: "role", label: "Role", render: (v: Person["role"]) => ROLE_LABEL[v] },
  { key: "houseCount", label: "Houses", render: (v: number, p) => (p.role === "ROOT" ? "All" : v) },
  { key: "suspended", label: "Status", render: (_: boolean, p) => <StatusBadge person={p} /> },
  { key: "lastLoginAt", label: "Last login", render: (v: string | null) => when(v) },
];

export default function PeopleList() {
  const router = useRouter();
  const { isRoot } = useAccess();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "AGENT" });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; username: string; password: string } | null>(null);

  useEffect(() => {
    adminApi<Person[]>("users")
      .then(setPeople)
      .catch((e) => {
        toast.error(e.message);
        setPeople([]);
      });
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const made = await adminApi<{ id: string; username: string; tempPassword: string }>("users", "POST", form);
      setAdding(false);
      setForm({ username: "", name: "", role: "AGENT" });
      setCreated({ id: made.id, username: made.username, password: made.tempPassword });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!people) return <SkeletonPage variant="cards" columns={6} />;

  return (
    <>
      {isRoot && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => setAdding(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm shadow-purple-600/20"
          >
            <UserPlus />
            Add person
          </Button>
        </div>
      )}
      <DataTable
        data={people}
        columns={columns}
        filters={[
          {
            key: "role",
            label: "Filter by Role",
            options: [{ value: "all", label: "Everyone" }, ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))],
          },
        ]}
        searchPlaceholder="Search name or username..."
        exportFilename="people"
        caption="People who can log in"
        emptyLabel="Nobody yet"
        onRowClick={(p) => router.push(`/admin/people/${p.id}`)}
        mobileCard={{ title: "name", subtitle: "username", value: "role" }}
      />

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <form onSubmit={create} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add person</DialogTitle>
              <DialogDescription>
                They get a temporary password. You choose their houses and rights next.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoCapitalize="none"
                required
                pattern="[A-Za-z0-9._\-]{3,30}"
                title="3 to 30 letters, digits, dots, dashes or underscores"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agent: works on the houses you give them</SelectItem>
                  <SelectItem value="ADMIN">Admin: also sees the log and everyone&apos;s rights</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TempPasswordDialog
        shown={created && { username: created.username, password: created.password }}
        onClose={() => router.push(`/admin/people/${created!.id}`)}
      />
    </>
  );
}
