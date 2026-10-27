"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shows a temporary password once, for whoever set it to pass on in person. */
export function TempPasswordDialog({
  shown,
  onClose,
}: {
  shown: { username: string; password: string } | null;
  onClose: () => void;
}) {
  const copy = () =>
    navigator.clipboard
      .writeText(shown!.password)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Could not copy. Select the password and copy it instead."));

  return (
    <Dialog open={!!shown} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
          <DialogDescription>
            It is shown only this once. {shown?.username} logs in with it and then sets a password only they know.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Username</p>
          <p className="font-mono text-base">{shown?.username}</p>
          <p className="pt-2 text-xs text-muted-foreground">Temporary password</p>
          <div className="flex items-center justify-between gap-2">
            <p className="select-all font-mono text-lg tracking-wider">{shown?.password}</p>
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy />
              Copy
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
