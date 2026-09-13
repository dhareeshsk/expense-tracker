"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { NotificationItem } from "@/lib/types";
import {
  isPushSupported,
  getExistingPushSubscription,
  subscribeToPush,
} from "@/lib/push-client";
import { useToast } from "@/components/toast-provider";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function targetUrl(notification: NotificationItem): string {
  if (notification.type === "reminder") return "/reminders";
  if (notification.type === "budget_alert") return "/budgets";
  if (notification.type === "household" && notification.relatedId) {
    return `/households/${notification.relatedId}`;
  }
  return "/households";
}

export function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const reduceMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load, then poll
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPushSupported()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check on mount
      setPushEnabled(false);
      return;
    }
    getExistingPushSubscription().then((sub) => setPushEnabled(Boolean(sub)));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleEnablePush() {
    try {
      await subscribeToPush();
      setPushEnabled(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable push notifications");
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleSelect(notification: NotificationItem) {
    if (!notification.isRead) {
      fetch(`/api/notifications/${notification.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    router.push(targetUrl(notification));
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted"
      >
        {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface-card shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium text-text">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-text-muted">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-sm text-text-muted">No notifications yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        onClick={() => handleSelect(notification)}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-muted ${
                          notification.isRead ? "text-text-muted" : "text-text"
                        }`}
                      >
                        {!notification.isRead && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        )}
                        <span className={notification.isRead ? "" : "ml-0"}>
                          <span className="block">{notification.message}</span>
                          <span className="text-xs text-text-faint">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {pushEnabled === false && (
              <div className="border-t border-border p-3">
                <button
                  onClick={handleEnablePush}
                  className="w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted"
                >
                  Enable push notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
