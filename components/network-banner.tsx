"use client";

import { useConnection, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui";
import { TARGET_CHAIN } from "@/lib/contracts";
import { describeError } from "@/lib/errors";

export function NetworkBanner() {
  const { status, chainId } = useConnection();
  const switchChain = useSwitchChain();

  if (status !== "connected" || chainId === TARGET_CHAIN.id) return null;

  return (
    <div role="alert" className="border-b border-warning/30 bg-warning/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-warning">Wrong network</p>
          <p className="text-xs text-muted-foreground">
            {`Your wallet is on chain ${chainId ?? "unknown"}. Governance actions need ${TARGET_CHAIN.name} (chain ID ${TARGET_CHAIN.id}). Dashboard data below is still read directly from ${TARGET_CHAIN.name}.`}
          </p>
          {switchChain.error ? (
            <p className="mt-1 text-xs text-destructive">
              {`${describeError(switchChain.error)} You can also add ${TARGET_CHAIN.name} manually in your wallet.`}
            </p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          onClick={() => switchChain.mutate({ chainId: TARGET_CHAIN.id })}
          disabled={switchChain.isPending}
          className="shrink-0"
        >
          {switchChain.isPending ? "Confirm in wallet…" : `Switch to ${TARGET_CHAIN.name}`}
        </Button>
      </div>
    </div>
  );
}
