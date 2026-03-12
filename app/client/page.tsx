import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  Package,
  FileText,
  Gift,
  Tag,
  HelpCircle,
  ArrowRight,
  Settings,
} from "lucide-react";

export default async function ClientHomePage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name || "Cliente";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <section className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-dark to-dark/90 text-cream rounded-2xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-widest text-stone/80 mb-1">
          {greeting}
        </p>
        <h1 className="font-display text-2xl md:text-3xl">{name}</h1>
        <p className="text-stone text-sm mt-2 max-w-lg">
          Desde aquí puedes consultar tus pedidos, revisar cotizaciones,
          pagar facturas, gestionar tu programa de fidelidad y aprovechar ofertas exclusivas.
        </p>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickCard
          href="/client/orders"
          icon={Package}
          title="Mis pedidos"
          description="Consulta el estado de tus órdenes activas e historial completo."
          color="terracotta"
        />
        <QuickCard
          href="/client/quotes"
          icon={FileText}
          title="Cotizaciones"
          description="Revisa, aprueba o rechaza cotizaciones enviadas por el equipo."
          color="terracotta"
        />
        <QuickCard
          href="/client/invoices"
          icon={FileText}
          title="Facturas"
          description="Visualiza y paga tus facturas pendientes con tarjeta."
          color="terracotta"
        />
        <QuickCard
          href="/client/loyalty"
          icon={Gift}
          title="Loyalty"
          description="Acumula puntos, sube de nivel y comparte tu código de referidos."
          color="olive"
        />
        <QuickCard
          href="/client/offers"
          icon={Tag}
          title="Ofertas y cupones"
          description="Códigos de descuento activos para tus próximos pedidos."
          color="olive"
        />
        <QuickCard
          href="/client/help"
          icon={HelpCircle}
          title="Guía de uso"
          description="Tutorial paso a paso, glosario, preguntas frecuentes y más."
          color="dark"
        />
      </div>

      {/* Settings shortcut */}
      <Link
        href="/client/settings"
        className="flex items-center justify-between bg-white border border-stone/20 rounded-xl p-4 hover:border-terracotta/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-stone/10 flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-dark" />
          </div>
          <div>
            <p className="text-sm font-medium text-dark">Configuración de la cuenta</p>
            <p className="text-xs text-muted">Preferencias de notificación y datos personales</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-stone group-hover:text-terracotta transition-colors" />
      </Link>
    </section>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const iconBg =
    color === "olive"
      ? "bg-olive/10 text-olive"
      : color === "dark"
        ? "bg-stone/15 text-dark"
        : "bg-terracotta/10 text-terracotta";

  return (
    <Link
      href={href}
      className="group bg-white border border-stone/20 rounded-xl p-5 hover:border-terracotta/50 hover:shadow-sm transition-all"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-lg text-dark group-hover:text-terracotta transition-colors">
        {title}
      </h2>
      <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>
    </Link>
  );
}
