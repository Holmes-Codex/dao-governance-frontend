import type { ReactNode } from "react";
import { NetworkBanner } from "@/components/network-banner";
import { SiteHeader } from "@/components/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <NetworkBanner />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        Testnet only. Never use real funds. This interface never deploys or replaces contracts.
      </footer>
    </>
  );
}
