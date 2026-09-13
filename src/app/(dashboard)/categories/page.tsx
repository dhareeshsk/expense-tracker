"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { resolveIcon } from "@/lib/icon-map";
import { Spinner } from "@/components/spinner";

const COLOR_OPTIONS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {COLOR_OPTIONS.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onChange(option)}
          className={`h-7 w-7 rounded-full border-2 ${
            value === option ? "border-text" : "border-transparent"
          }`}
          style={{ backgroundColor: option }}
          aria-label={`Choose color ${option}`}
        />
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const isCreateValid = useMemo(() => name.trim().length > 0, [name]);
  const isEditValid = useMemo(() => editName.trim().length > 0, [editName]);

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(data);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from the server
    loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setNameError("Category name is required");
      return;
    }
    setNameError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
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
    await loadCategories();
    toast.success("Category added");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const response = await fetch(`/api/categories/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Could not delete category";
      toast.error(message);
      setDeleteTarget(null);
      return;
    }
    if (editingId === deleteTarget.id) setEditingId(null);
    setDeleteTarget(null);
    await loadCategories();
    toast.success("Category deleted");
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color ?? COLOR_OPTIONS[0]);
    setEditNameError(null);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);

    if (!editName.trim()) {
      setEditNameError("Category name is required");
      return;
    }
    setEditNameError(null);
    setIsSavingEdit(true);

    const response = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });

    setIsSavingEdit(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error ?? "Something went wrong";
      setEditError(message);
      toast.error(message);
      return;
    }

    setEditingId(null);
    await loadCategories();
    toast.success("Category updated");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Categories</h1>
        <p className="text-sm text-text-muted">
          Organize your transactions into categories.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        noValidate
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-card p-4"
      >
        <div className="min-w-[150px] flex-1">
          <label className="block text-sm font-medium text-text">
            New category name
          </label>
          <input
            type="text"
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
        <div>
          <label className="block text-sm font-medium text-text">Color</label>
          <div className="mt-1">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isCreateValid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting && (
            <Spinner />
          )}
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </form>

      {error && <p className="text-sm text-budget-critical">{error}</p>}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
          {categories.map((category) => {
            const CategoryIcon = resolveIcon(category.icon);
            return (
            <li key={category.id} className="px-4 py-3">
              {editingId === category.id ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[150px] flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditNameError(null);
                      }}
                      className="w-full rounded-md border border-border px-3 py-1.5 text-sm"
                    />
                    {editNameError && (
                      <p className="mt-1 text-xs text-budget-critical">{editNameError}</p>
                    )}
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <button
                    onClick={() => handleSaveEdit(category.id)}
                    disabled={isSavingEdit || !isEditValid}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isSavingEdit && (
                      <Spinner size="xs" />
                    )}
                    {isSavingEdit ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Cancel
                  </button>
                  {editError && (
                    <p className="w-full text-sm text-budget-critical">{editError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon size={16} style={{ color: category.color ?? "#6b7280" }} />
                    <span className="text-sm text-text">{category.name}</span>
                    {category.isDefault && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-faint">
                        default
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => startEdit(category)}
                      className="mr-3 text-sm text-text-muted hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(category)}
                      className="text-sm text-budget-critical hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this category?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. Existing transactions in this category are not affected unless the server rejects the deletion.`
            : undefined
        }
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
