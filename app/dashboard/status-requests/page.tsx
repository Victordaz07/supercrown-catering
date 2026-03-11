import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StatusRequestsBoard } from "./status-requests-board";

export default async function StatusRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl text-dark mb-2">Status Requests</h1>
      <p className="text-sm text-muted mb-6">
        Review and process order status-change requests.
      </p>
      <StatusRequestsBoard role={session.user.role} />
    </div>
  );
}
