import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NotificationPrefsForm } from "./NotificationPrefsForm";

export default async function ClientSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });
  const raw = (user?.notificationPrefs as Record<string, boolean>) ?? {};
  const prefs = {
    email: raw.email !== false,
    statusUpdates: raw.statusUpdates !== false,
    invoices: raw.invoices !== false,
    quotes: raw.quotes !== false,
  };

  return (
    <section className="max-w-xl">
      <h1 className="font-display text-2xl text-dark mb-6">Configuración</h1>

      <div className="bg-white border border-stone/30 rounded-xl p-6">
        <h2 className="font-display text-lg text-dark mb-1">
          ¿Qué emails quieres recibir?
        </h2>
        <p className="text-sm text-muted mb-4">
          Controla las notificaciones por email de Super Crown Catering.
        </p>
        <NotificationPrefsForm initialPrefs={prefs} />
      </div>
    </section>
  );
}
