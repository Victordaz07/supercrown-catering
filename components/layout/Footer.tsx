import Link from "next/link";

export function Footer() {
  const menuLinks = [
    { href: "#menu", label: "Box Lunches" },
    { href: "#menu", label: "Grab-n-Go" },
    { href: "/menu", label: "Full Menu" },
  ];

  const companyLinks = [
    { href: "#", label: "About" },
    { href: "#", label: "Gallery" },
    { href: "#reviews", label: "Reviews" },
    { href: "#", label: "FAQ" },
  ];

  const contactLinks = [
    { href: "#quote", label: "Get a Quote" },
    { href: "/login", label: "Login" },
    { href: "mailto:hello@supercrown.com", label: "Email Us" },
    { href: "#", label: "Instagram" },
  ];

  return (
    <footer className="bg-dark w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-20 w-full">
        {/* Top section - 4 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
          {/* Col 1: Logo + tagline */}
          <div>
            <Link href="/" className="block mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Super Crown Catering"
                className="h-10 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-stone text-sm">
              Fresh catering for corporate events, schools, and private gatherings.
            </p>
          </div>

          {/* Col 2: Menu links */}
          <div>
            <h3 className="text-cream font-semibold mb-4 text-sm uppercase tracking-wider">Menu</h3>
            <ul className="space-y-3">
              {menuLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-stone hover:text-cream transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Company links */}
          <div>
            <h3 className="text-cream font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-stone hover:text-cream transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact links */}
          <div>
            <h3 className="text-cream font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-stone hover:text-cream transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-stone/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted text-sm">© {new Date().getFullYear()} Super Crown Catering. All rights reserved.</p>
          <p className="text-muted text-sm">Made with care ♥</p>
        </div>
      </div>
    </footer>
  );
}
