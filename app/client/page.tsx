import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ClientHomePage() {
  const session = await getServerSession(authOptions);

  return (
    <section className="space-y-6">
      <div className="bg-white border border-stone/30 rounded-xl p-6">
        <p className="text-sm uppercase tracking-wider text-muted mb-2">Bienvenido</p>
        <h1 className="font-display text-3xl text-dark">
          Hola, {session?.user?.name || "Cliente"}
        </h1>
        <p className="text-muted mt-2">
          Desde aqui puedes revisar tus pedidos, programa de loyalty y ofertas activas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/client/orders"
          className="bg-white border border-stone/30 rounded-xl p-5 hover:border-terracotta transition-colors"
        >
          <h2 className="font-display text-xl text-dark">Mis pedidos</h2>
          <p className="text-sm text-muted mt-1">Consulta estado, fecha e historial de ordenes.</p>
        </Link>
        <Link
          href="/client/loyalty"
          className="bg-white border border-stone/30 rounded-xl p-5 hover:border-terracotta transition-colors"
        >
          <h2 className="font-display text-xl text-dark">Loyalty</h2>
          <p className="text-sm text-muted mt-1">Puntos, nivel, beneficios y referidos.</p>
        </Link>
        <Link
          href="/client/offers"
          className="bg-white border border-stone/30 rounded-xl p-5 hover:border-terracotta transition-colors"
        >
          <h2 className="font-display text-xl text-dark">Ofertas y cupones</h2>
          <p className="text-sm text-muted mt-1">Codigos activos para tus proximos pedidos.</p>
        </Link>
      </div>
    </section>
  );
}
