"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChangePasswordForm } from "./change-password-form";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-medium">
            Change password
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Pick something you&apos;ll remember. At least 8 characters.
          </DialogDescription>
        </DialogHeader>
        <ChangePasswordForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
