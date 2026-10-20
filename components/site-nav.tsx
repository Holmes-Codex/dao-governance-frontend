"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/proposals", label: "Proposals" },
  { href: "/proposals/new", label: "New proposal" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const activeHref =
    pathname === "/proposals/new" ? "/proposals/new" : pathname.startsWith("/proposals") ? "/proposals" : "/";

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
