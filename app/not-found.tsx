import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="font-display text-8xl font-light text-dark mb-2">404</h1>
      <p className="text-muted text-lg mb-8">Page not found</p>
      <p className="text-dark text-center max-w-md mb-8">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. Maybe it&apos;s
        moved or the link is broken.
      </p>
      <Link href="/">
        <Button variant="primary">Back to Home</Button>
      </Link>
    </main>
  );
}
