"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Household } from "@/lib/types";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

type Profile = {
  name: string | null;
  email: string;
  createdAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setEmail(data.email);
      });
    fetch("/api/households")
      .then((res) => res.json())
      .then(setHouseholds);
  }, []);

  const isEmailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const isPasswordFormValid = useMemo(
    () =>
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length > 0 &&
      newPassword === confirmPassword,
    [currentPassword, newPassword, confirmPassword],
  );

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEmailValid) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);

    setIsSaving(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    const updated = await response.json();
    setProfile(updated);
    toast.success(
      email !== profile?.email
        ? "Profile updated. Log out and back in to see your new email everywhere."
        : "Profile updated",
    );
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    const errors: typeof passwordFieldErrors = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";
    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setPasswordFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingPassword(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setIsSavingPassword(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setPasswordError(message);
      toast.error(message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed");
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
        <Skeleton className="h-48 w-full max-w-sm" />
        <Skeleton className="h-56 w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-text">Profile</h1>
        <p className="text-sm text-text-muted">
          Manage your account details.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-medium text-text">Profile</h2>
        <form onSubmit={handleSaveProfile} noValidate className="max-w-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-text">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            {emailError && (
              <p className="mt-1 text-xs text-budget-critical">{emailError}</p>
            )}
          </div>
          {error && <p className="text-sm text-budget-critical">{error}</p>}
          <button
            type="submit"
            disabled={isSaving || !isEmailValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving && (
              <Spinner />
            )}
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-medium text-text">
          Change password
        </h2>
        <form onSubmit={handleChangePassword} noValidate className="max-w-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-text">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
              }}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            {passwordFieldErrors.currentPassword && (
              <p className="mt-1 text-xs text-budget-critical">
                {passwordFieldErrors.currentPassword}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-faint">At least 8 characters.</p>
            {passwordFieldErrors.newPassword && (
              <p className="mt-1 text-xs text-budget-critical">
                {passwordFieldErrors.newPassword}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            {passwordFieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-budget-critical">
                {passwordFieldErrors.confirmPassword}
              </p>
            )}
          </div>
          {passwordError && (
            <p className="text-sm text-budget-critical">{passwordError}</p>
          )}
          <button
            type="submit"
            disabled={isSavingPassword || !isPasswordFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSavingPassword && (
              <Spinner />
            )}
            {isSavingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-medium text-text">Households</h2>
        {households.length === 0 ? (
          <p className="text-sm text-text-muted">
            You&apos;re not part of any household yet.{" "}
            <Link href="/households" className="text-primary underline">
              Create or join one
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {households.map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <Link
                  href={`/households/${h.id}`}
                  className="text-text hover:underline"
                >
                  {h.name}
                </Link>
                <span className="text-text-faint">
                  {h.members.length} member{h.members.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
