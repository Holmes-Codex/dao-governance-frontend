"use client";

import type { ReactNode } from "react";
import { formatEther, type Address } from "viem";
import { AccountPanel } from "@/components/account-panel";
import { DelegationCard } from "@/components/delegation-card";
import { Badge, Button, Card, CardHeader, Skeleton } from "@/components/ui";
import { useDaoStatus } from "@/hooks/use-dao-status";
import { CONTRACTS, explorerAddressUrl } from "@/lib/contracts";
import { blocksToApproxDuration, formatDuration, formatToken, shortAddress } from "@/lib/format";

export function ContractStatus() {
  const s = useDaoStatus();
  const loading = s.isLoading;
  const symbol = s.token.symbol ?? "DGT";

  const sameAddress = (a?: Address, b?: Address) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  const wiringOk =
    sameAddress(s.governor.tokenAddress, CONTRACTS.token) &&
    sameAddress(s.governor.timelockAddress, CONTRACTS.timelock) &&
    sameAddress(s.target.owner, CONTRACTS.timelock) &&
    s.timelock.governorIsProposer === true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">Governance overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live, read-only state of the deployed DAO contracts on Arbitrum Sepolia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? null : s.isError || s.failedReads > 0 ? (
            <Badge tone="danger">{s.isError ? "RPC unavailable" : `${s.failedReads} read(s) failed`}</Badge>
          ) : (
            <Badge tone={wiringOk ? "success" : "warning"}>{wiringOk ? "Contracts verified" : "Check wiring"}</Badge>
          )}
          <Button variant="secondary" onClick={() => s.refetch()} disabled={s.isFetching}>
            {s.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1 lg:row-span-2">
          <AccountPanel proposalThreshold={s.governor.proposalThreshold} />
          <DelegationCard />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title={s.governor.name ?? "Governor"}
            description="Governor settings. Timing uses the Governor's block-number clock, which tracks Ethereum L1 blocks (~12 s each) on Arbitrum."
          />
          <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
            <Metric label="Voting delay" loading={loading}
              value={`${s.governor.votingDelay?.toString() ?? "—"} blocks`}
              hint={blocksToApproxDuration(s.governor.votingDelay)} />
            <Metric label="Voting period" loading={loading}
              value={`${s.governor.votingPeriod?.toLocaleString("en-US") ?? "—"} blocks`}
              hint={blocksToApproxDuration(s.governor.votingPeriod)} />
            <Metric label="Proposal threshold" loading={loading}
              value={`${formatToken(s.governor.proposalThreshold)} ${symbol}`} hint="Voting power required" />
            <Metric label="Quorum" loading={loading}
              value={s.governor.quorumNumerator !== undefined && s.governor.quorumDenominator
                ? `${(Number(s.governor.quorumNumerator) * 100) / Number(s.governor.quorumDenominator)}%` : "—"}
              hint={`≈ ${formatToken(s.governor.estimatedQuorum)} ${symbol} (For + Abstain)`} />
            <Metric label="Timelock delay" loading={loading}
              value={s.timelock.minDelay !== undefined ? formatDuration(Number(s.timelock.minDelay)) : "—"}
              hint="Minimum wait after queueing" />
            <Metric label="Current clock" loading={loading}
              value={s.governor.clock?.toLocaleString("en-US") ?? "—"} hint="L1 block number" />
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Timelock permissions" description="Roles held on the TimelockController." />
          <ul className="divide-y divide-border text-sm">
            <RoleRow label="Governor holds PROPOSER_ROLE" ok={s.timelock.governorIsProposer} loading={loading} />
            <RoleRow label="Governor holds CANCELLER_ROLE" ok={s.timelock.governorIsCanceller} loading={loading} />
            <RoleRow label="Anyone can execute (EXECUTOR_ROLE → 0x0)" ok={s.timelock.openExecutor} loading={loading} />
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="ExecutionTarget"
            description="Owned by the Timelock. Changes need a successful proposal: propose, vote, queue, wait, then execute."
          />
          <dl className="grid grid-cols-2 gap-px bg-border">
            <Metric label="Stored number" loading={loading} value={s.target.number?.toString() ?? "—"} />
            <Metric label="ETH balance" loading={loading}
              value={s.target.balance !== undefined ? `${formatEther(s.target.balance)} ETH` : "—"} />
          </dl>
          <p className="px-5 py-3 text-xs text-muted-foreground">
            {"Owner: "}
            <span className="font-mono">{shortAddress(s.target.owner)}</span>
            {s.target.owner
              ? sameAddress(s.target.owner, CONTRACTS.timelock) ? " (TimelockController)" : " (not the Timelock)"
              : null}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Deployed contracts" description={`Arbitrum Sepolia · ${symbol} total supply ${formatToken(s.token.totalSupply)}`} />
        <ul className="divide-y divide-border text-sm">
          <AddressRow label="DAOGovernanceToken" address={CONTRACTS.token} />
          <AddressRow label="TimelockController" address={CONTRACTS.timelock} />
          <AddressRow label="DAOGovernor" address={CONTRACTS.governor} />
          <AddressRow label="ExecutionTarget" address={CONTRACTS.executionTarget} />
        </ul>
      </Card>
    </div>
  );
}

function Metric({ label, value, hint, loading }: { label: string; value: ReactNode; hint?: string; loading?: boolean }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-base font-medium tabular-nums">
        {loading ? <Skeleton className="h-5 w-20" /> : value}
      </dd>
      {hint && !loading ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RoleRow({ label, ok, loading }: { label: string; ok?: boolean; loading: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span>{label}</span>
      {loading ? <Skeleton className="h-5 w-12" /> : ok === undefined ? <Badge>Unknown</Badge>
        : <Badge tone={ok ? "success" : "danger"}>{ok ? "Yes" : "No"}</Badge>}
    </li>
  );
}

function AddressRow({ label, address }: { label: string; address: Address }) {
  return (
    <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <a href={explorerAddressUrl(address)} target="_blank" rel="noopener noreferrer"
        className="break-all font-mono text-xs text-primary underline-offset-4 hover:underline">
        {address}
        <span className="sr-only"> (opens Arbiscan in a new tab)</span>
      </a>
    </li>
  );
}
