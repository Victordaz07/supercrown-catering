import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HelpCenter } from "@/app/dashboard/help/HelpCenter";

export default async function ClientHelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-dark">User Guide</h1>
        <p className="text-muted text-sm mt-1">
          Step-by-step guides, glossary, FAQ, and troubleshooting for the Client Portal.
        </p>
      </div>

      <HelpCenter
        userRole="CLIENT"
        userName={session.user.name}
      />
    </div>
  );
}
