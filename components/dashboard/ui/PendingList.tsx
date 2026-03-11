import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardTask } from "@/lib/dashboard/types";
import { StatusBadge } from "@/components/dashboard/ui/StatusBadge";

type PendingListProps = {
  tasks: DashboardTask[];
};

function tone(priority: DashboardTask["priority"]) {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "info";
}

export function PendingList({ tasks }: PendingListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone/20 p-4 text-sm text-muted">
        No hay pendientes por ahora.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone/20 divide-y divide-stone/15">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={task.href}
          className="p-4 flex items-start justify-between gap-4 hover:bg-warm/40 transition-colors"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-dark">{task.title}</p>
              <StatusBadge label={task.priority} tone={tone(task.priority)} />
            </div>
            <p className="text-sm text-muted mt-1">{task.subtitle}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted mt-1 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
