"use client";

import { useEffect, useRef, useTransition } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import type { MyAnnouncement } from "@/server/services/announcements";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<MyAnnouncement["type"], string> = {
  INFO: "border-l-slate-400",
  WARNING: "border-l-amber-500",
  URGENT: "border-l-red-500",
};

export function AnnouncementsBell({
  announcements,
  markSeen,
  toastOnMount = false,
}: {
  announcements: MyAnnouncement[];
  markSeen: (ids: string[]) => Promise<void>;
  /** Exactly ONE rendered instance may own the toast side-effect —
      the desktop and mobile headers both mount this component. */
  toastOnMount?: boolean;
}) {
  const [, startTransition] = useTransition();
  // Guards against strict-mode double-fire and re-renders re-toasting.
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!toastOnMount) return;
    const unseen = announcements.filter((a) => !a.seen && !toastedRef.current.has(a.id));
    if (unseen.length === 0) return;
    for (const a of unseen) {
      toastedRef.current.add(a.id);
      const show = a.type === "URGENT" ? toast.error : a.type === "WARNING" ? toast.warning : toast.info;
      show(a.title, { description: a.body, duration: 8000 });
    }
    startTransition(() => markSeen(unseen.map((a) => a.id)));
  }, [announcements, markSeen, toastOnMount]);

  // Server truth only (refs must not be read during render); the badge
  // clears when the layout refetches with the seen rows written.
  const unseenCount = announcements.filter((a) => !a.seen).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {unseenCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-semibold">Notifications</div>
        {announcements.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Koi notification nahi.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {announcements.map((a) => (
              <li key={a.id} className={cn("border-l-2 px-3 py-2.5", TYPE_STYLES[a.type])}>
                <div className="text-sm font-medium">{a.title}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
