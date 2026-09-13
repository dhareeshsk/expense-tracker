"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  name: string | null;
  email: string;
  createdAt: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setEmail(data.email);
      });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setSuccess(
      email !== profile?.email
        ? "Profile updated. Log out and back in to see your new email everywhere."
        : "Profile updated.",
    );
    const updated = await response.json();
    setProfile(updated);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setIsSavingPassword(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setIsSavingPassword(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setPasswordError(body?.error ?? "Something went wrong");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPasswordSuccess("Password changed.");
  }

  if (!profile) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your profile and account.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">Profile</h2>
        <form onSubmit={handleSaveProfile} className="max-w-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Save profile
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">
          Change password
        </h2>
        <form onSubmit={handleChangePassword} className="max-w-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-700">{passwordSuccess}</p>
          )}
          <button
            type="submit"
            disabled={isSavingPassword}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Change password
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">
          Other management
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/categories" className="text-gray-700 underline">
              Manage categories
            </Link>
          </li>
          <li>
            <Link href="/budgets" className="text-gray-700 underline">
              Manage budgets
            </Link>
          </li>
          <li>
            <Link href="/households" className="text-gray-700 underline">
              Manage households
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
