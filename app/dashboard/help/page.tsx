import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { HelpCenter } from "./HelpCenter";

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User Guides"
        subtitle="Comprehensive step-by-step guides, process diagrams, glossary, FAQ, and troubleshooting for every role."
      />

      <HelpCenter
        userRole={session.user.role}
        userName={session.user.name}
      />
    </div>
  );
}
