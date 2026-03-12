import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ClientShell } from "@/components/client/ClientShell";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (session.user.role !== "CLIENT") {
    redirect("/dashboard");
  }

  return (
    <ClientShell userName={session.user.name}>
      {children}
    </ClientShell>
  );
}
