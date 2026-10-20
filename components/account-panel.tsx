"use client";

import { zeroAddress } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import { Badge, Card, CardHeader, Skeleton } from "@/components/ui";
import { tokenAbi } from "@/lib/abis";
import { CONTRACTS, TARGET_CHAIN_ID } from "@/lib/contracts";
import { formatToken, shortAddress } from "@/lib/format";

const token = { address: CONTRACTS.token, abi: tokenAbi, chainId: TARGET_CHAIN_ID } as const;

export function AccountPanel({ proposalThreshold }: { proposalThreshold?: bigint }) {
  const { address, status } = useConnection();

  const { data, isLoading } = useReadContracts({
    allowFailure: false,
    contracts: address
      ? [
          { ...token, functionName: "balanceOf", args: [address] },
          { ...token, functionName: "getVotes", args: [address] },
          { ...token, functionName: "delegates", args: [address] },
        ]
      : [],
    query: { enabled: Boolean(address) },
  });

  if (status !== "connected" || !address) {
    return (
      <Card>
        <CardHeader title="Your account" description="Connect a wallet to see your DGT balance and voting power." />
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Reading data does not need a wallet. A wallet is only needed to delegate, propose, or vote.
        </p>
      </Card>
    );
  }

  const [balance, votes, delegatee] = (data ?? []) as [bigint?, bigint?, `0x${string}`?];
  const delegationLabel =
    delegatee === undefined
      ? null
      : delegatee === zeroAddress
        ? { tone: "warning" as const, text: "Not delegated" }
        : delegatee.toLowerCase() === address.toLowerCase()
          ? { tone: "success" as const, text: "Self-delegated" }
          : { tone: "accent" as const, text: `Delegated to ${shortAddress(delegatee)}` };

  const canPropose = votes !== undefined && proposalThreshold !== undefined && votes >= proposalThreshold;

  return (
    <Card>
      <CardHeader
        title="Your account"
        description={<span className="font-mono">{address}</span>}
        action={delegationLabel ? <Badge tone={delegationLabel.tone}>{delegationLabel.text}</Badge> : null}
      />
      <dl className="grid grid-cols-2 gap-px bg-border">
        <Stat label="DGT balance" value={isLoading ? undefined : formatToken(balance)} />
        <Stat label="Voting power" value={isLoading ? undefined : formatToken(votes)} />
      </dl>
      <div className="px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        {delegatee === zeroAddress ? (
          <p>
            ERC20Votes only counts votes once tokens are delegated. Delegate (including to yourself) to activate
            your voting power using the delegation card below.
          </p>
        ) : proposalThreshold !== undefined && votes !== undefined ? (
          <p>
            {canPropose
              ? "Your voting power meets the proposal threshold."
              : `You need ${formatToken(proposalThreshold)} DGT of voting power to create proposals.`}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-medium tabular-nums">
        {value === undefined ? <Skeleton className="h-6 w-24" /> : value}
      </dd>
    </div>
  );
}
