"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Spinner } from "@/components/spinner";

type SiteSettings = {
  siteName: string;
  footerText: string;
};

export default function AdminSiteSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [footerText, setFooterText] = useState("");
  const [siteNameError, setSiteNameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isValid = useMemo(() => siteName.trim().length > 0, [siteName]);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((res) => res.json())
      .then((data: SiteSettings) => {
        setSiteName(data.siteName);
        setFooterText(data.footerText);
        setIsLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!siteName.trim()) {
      setSiteNameError("Site name is required");
      return;
    }
    setSiteNameError(null);

    setIsSaving(true);
    const response = await fetch("/api/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: siteName.trim(), footerText }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Site settings saved");
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
        <Skeleton className="h-56 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Site settings</h1>
        <p className="text-sm text-text-muted">
          Update the site name shown in the header/footer, and the footer copy.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        noValidate
        className="max-w-md space-y-4 rounded-lg border border-border bg-surface-card p-4"
      >
        <div>
          <label className="block text-sm font-medium text-text">
            Site name
          </label>
          <input
            type="text"
            maxLength={60}
            value={siteName}
            onChange={(e) => {
              setSiteName(e.target.value);
              setSiteNameError(null);
            }}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          {siteNameError && (
            <p className="mt-1 text-xs text-budget-critical">{siteNameError}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text">
            Footer text
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-budget-critical">{error}</p>}
        <button
          type="submit"
          disabled={isSaving || !isValid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isSaving && (
            <Spinner />
          )}
          {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
