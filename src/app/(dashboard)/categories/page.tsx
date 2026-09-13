"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";

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
            value === option ? "border-gray-900" : "border-transparent"
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    setIsSubmitting(true);

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setName("");
    await loadCategories();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error ?? "Could not delete category");
      return;
    }
    if (editingId === id) setEditingId(null);
    await loadCategories();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color ?? COLOR_OPTIONS[0]);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    setIsSavingEdit(true);

    const response = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
    });

    setIsSavingEdit(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setEditError(body?.error ?? "Something went wrong");
      return;
    }

    setEditingId(null);
    await loadCategories();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Categories</h1>
        <p className="text-sm text-gray-500">
          Organize your transactions into categories.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700">
            New category name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="mt-1">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {categories.map((category) => (
            <li key={category.id} className="px-4 py-3">
              {editingId === category.id ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[150px]">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <button
                    onClick={() => handleSaveEdit(category.id)}
                    disabled={isSavingEdit}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                  {editError && (
                    <p className="w-full text-sm text-red-600">{editError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color ?? "#6b7280" }}
                    />
                    <span className="text-sm text-gray-900">
                      {category.name}
                    </span>
                    {category.isDefault && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        default
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => startEdit(category)}
                      className="mr-3 text-sm text-gray-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
