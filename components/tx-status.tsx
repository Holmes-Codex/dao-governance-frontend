"use client";

import type { Transaction } from "@/hooks/use-transaction";
import { explorerTxUrl } from "@/lib/contracts";
import { cn } from "@/lib/format";

const PHASE_TEXT = {
  simulating: "Simulating transaction…",
  signing: "Simulation passed. Confirm in your wallet…",
  pending: "Transaction submitted. Waiting for confirmation…",
  confirmed: "Transaction confirmed.",
} as const;

export function TxStatus({ tx, successText }: { tx: Transaction; successText?: string }) {
  if (tx.phase === "idle") return null;

  const isFailed = tx.phase === "failed";
  const isConfirmed = tx.phase === "confirmed";
  const message = isFailed ? tx.error : isConfirmed ? (successText ?? PHASE_TEXT.confirmed) : PHASE_TEXT[tx.phase];

  return (
    <div
      role={isFailed ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex flex-col gap-1 rounded-md border px-3 py-2 text-xs leading-relaxed",
        isFailed
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : isConfirmed
            ? "border-success/30 bg-success/10 text-success"
            : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <p className="flex items-center gap-2">
        {tx.isBusy ? (
          <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        <span>{message}</span>
      </p>
      {tx.hash ? (
        <a
          href={explorerTxUrl(tx.hash)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {`View on Arbiscan: ${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}`}
        </a>
      ) : null}
    </div>
  );
}
