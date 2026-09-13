"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Household, HouseholdInviteForMe } from "@/lib/types";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [invites, setInvites] = useState<HouseholdInviteForMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const isFormValid = useMemo(() => name.trim().length > 0, [name]);

  async function loadAll() {
    const [householdRes, inviteRes] = await Promise.all([
      fetch("/api/households"),
      fetch("/api/households/invites"),
    ]);
    const [householdData, inviteData] = await Promise.all([
      householdRes.json(),
      inviteRes.json(),
    ]);
    setHouseholds(householdData);
    setInvites(inviteData);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from the server
    loadAll();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setNameError("Household name is required");
      return;
    }
    setNameError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    setName("");
    await loadAll();
    toast.success("Household created");
  }

  async function handleAccept(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}/accept`, {
      method: "POST",
    });
    if (!response.ok) {
      toast.error("Could not accept invite");
      return;
    }
    await loadAll();
    toast.success("Invite accepted");
  }

  async function handleDecline(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not decline invite");
      return;
    }
    await loadAll();
    toast.success("Invite declined");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Households</h1>
        <p className="text-sm text-text-muted">
          Share select expenses (EMI, rent, shared bills) with family or roommates.
        </p>
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5 text-sm text-primary"
            >
              <span>
                You&apos;ve been invited to join{" "}
                <span className="font-medium">{invite.householdName}</span>
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAccept(invite.id)}
                  className="font-medium underline"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(invite.id)}
                  className="font-medium text-text-muted underline"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        noValidate
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-card p-4"
      >
        <div className="min-w-[150px] flex-1">
          <label className="block text-sm font-medium text-text">
            New household name
          </label>
          <input
            type="text"
            placeholder="Family, Roommates..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          {nameError && (
            <p className="mt-1 text-xs text-budget-critical">{nameError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting && (
            <Spinner />
          )}
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </form>

      {error && <p className="text-sm text-budget-critical">{error}</p>}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : households.length === 0 ? (
        <p className="text-sm text-text-muted">
          You&apos;re not part of any household yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
          {households.map((household) => (
            <li key={household.id} className="px-4 py-3">
              <Link
                href={`/households/${household.id}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-text-faint" />
                  <div>
                    <p className="text-sm font-medium text-text">
                      {household.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {household.members.length} member
                      {household.members.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-text-faint">View →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
