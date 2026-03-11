import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

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
    <div className="min-h-screen bg-cream">
      <header className="h-16 bg-dark text-cream border-b border-stone/30 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/client" className="font-display text-xl">
            Client Portal
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-stone">
            <Link href="/client/orders" className="hover:text-cream transition-colors">
              Mis pedidos
            </Link>
            <Link href="/client/loyalty" className="hover:text-cream transition-colors">
              Loyalty
            </Link>
            <Link href="/client/offers" className="hover:text-cream transition-colors">
              Ofertas
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-stone">{session.user.name}</span>
          <Link href="/" className="text-sm text-stone hover:text-cream transition-colors">
            Sitio
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">{children}</main>
    </div>
  );
}
