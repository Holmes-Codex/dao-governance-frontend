import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { WalletButton } from "@/components/wallet-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M3 21h18M5 21V10m14 11V10M9 21v-7m6 7v-7M2 10l10-6 10 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">DAO Governance</span>
              <span className="block text-xs text-muted-foreground">Arbitrum Sepolia testnet</span>
            </span>
          </Link>
          <SiteNav />
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
