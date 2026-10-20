"use client";

import type { Hash } from "viem";
import type { Transaction } from "@/hooks/use-transaction";
import { explorerTxUrl } from "@/lib/contracts";
import { cn } from "@/lib/format";

const PHASE_TEXT = {
  simulating: "Simulating transaction…",
  signing: "Simulation passed. Confirm in your wallet…",
  pending: "Transaction submitted. Waiting for confirmation…",
  confirmed: "Transaction confirmed.",
} as const;

const VARIANT_STYLES = {
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  confirmed: "border-success/30 bg-success/10 text-success",
  inProgress: "border-primary/30 bg-primary/10 text-primary",
} as const;

export function TxStatus({ tx, successText }: { tx: Transaction; successText?: string }) {
  if (tx.phase === "idle") return null;

  if (tx.phase === "failed") {
    return <StatusAlert variant="failed" message={tx.error} hash={tx.hash} busy={tx.isBusy} />;
  }
  if (tx.phase === "confirmed") {
    return (
      <StatusAlert variant="confirmed" message={successText ?? PHASE_TEXT.confirmed} hash={tx.hash} busy={tx.isBusy} />
    );
  }
  return <StatusAlert variant="inProgress" message={PHASE_TEXT[tx.phase]} hash={tx.hash} busy={tx.isBusy} />;
}

function StatusAlert({
  variant,
  message,
  hash,
  busy,
}: {
  variant: keyof typeof VARIANT_STYLES;
  message?: string;
  hash?: Hash;
  busy: boolean;
}) {
  return (
    <div
      role={variant === "failed" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex flex-col gap-1 rounded-md border px-3 py-2 text-xs leading-relaxed",
        VARIANT_STYLES[variant],
      )}
    >
      <p className="flex items-center gap-2">
        {busy ? (
          <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        <span>{message}</span>
      </p>
      {hash ? (
        <a
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {`View on Arbiscan: ${hash.slice(0, 10)}…${hash.slice(-8)}`}
        </a>
      ) : null}
    </div>
  );
}
