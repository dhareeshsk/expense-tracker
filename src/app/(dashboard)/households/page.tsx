"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Household, HouseholdInviteForMe } from "@/lib/types";

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [invites, setInvites] = useState<HouseholdInviteForMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    const response = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setName("");
    await loadAll();
  }

  async function handleAccept(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}/accept`, {
      method: "POST",
    });
    if (!response.ok) {
      alert("Could not accept invite");
      return;
    }
    await loadAll();
  }

  async function handleDecline(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Could not decline invite");
      return;
    }
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Households</h1>
        <p className="text-sm text-gray-500">
          Share select expenses (EMI, rent, shared bills) with family or roommates.
        </p>
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900"
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
                  className="font-medium text-gray-500 underline"
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
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700">
            New household name
          </label>
          <input
            type="text"
            required
            placeholder="Family, Roommates..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : households.length === 0 ? (
        <p className="text-sm text-gray-500">
          You&apos;re not part of any household yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {households.map((household) => (
            <li key={household.id} className="px-4 py-3">
              <Link
                href={`/households/${household.id}`}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {household.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {household.members.length} member
                    {household.members.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-sm text-gray-400">View →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
