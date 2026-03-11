import { BookOpenText, ShieldCheck, Route, Gift, Users } from "lucide-react";

const pillars = [
  {
    title: "Client Portal",
    icon: Users,
    points: [
      "Pedidos y estados en tiempo real",
      "Loyalty, puntos y referidos",
      "Ofertas y cupones activos",
    ],
  },
  {
    title: "Operational Control",
    icon: Route,
    points: [
      "Flujo comercial y ordenes",
      "Routing y entregas",
      "Facturacion y ajustes",
    ],
  },
  {
    title: "Governance",
    icon: ShieldCheck,
    points: [
      "Permisos por rol",
      "Trazabilidad y auditoria",
      "Menos riesgo operativo",
    ],
  },
];

export default function ProjectBriefPage() {
  return (
    <main className="min-h-screen bg-cream">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-20 py-16 space-y-12">
        <header className="bg-white border border-stone/30 rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-3 mb-3">
            <BookOpenText className="w-6 h-6 text-terracotta" />
            <p className="text-xs uppercase tracking-widest text-muted">Project Brief</p>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-dark leading-tight">
            Super Crown Catering Platform
          </h1>
          <p className="text-muted mt-4 max-w-3xl">
            Plataforma integral para ventas, operaciones, entrega y experiencia de cliente.
            Incluye portal de cliente, control interno por roles y trazabilidad completa.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="bg-white border border-stone/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-terracotta" />
                  <h2 className="font-display text-2xl text-dark">{pillar.title}</h2>
                </div>
                <ul className="space-y-2">
                  {pillar.points.map((point) => (
                    <li key={point} className="text-sm text-muted">
                      - {point}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="bg-dark text-cream rounded-2xl p-8 md:p-10">
          <h3 className="font-display text-3xl mb-6">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-sm">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">Cliente solicita pedido</div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">Ventas valida y cotiza</div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">Operacion planifica ruta</div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">Driver ejecuta entrega</div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">Finanzas cierra factura</div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-stone text-sm">
            <Gift className="w-4 h-4 text-terracotta" />
            El cliente sigue todo desde su portal: pedidos, loyalty y ofertas.
          </div>
        </section>
      </section>
    </main>
  );
}
