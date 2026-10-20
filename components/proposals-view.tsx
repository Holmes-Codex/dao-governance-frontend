"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, Button, Card, CardHeader, Skeleton } from "@/components/ui";
import { useProposals, useProposalSummaries } from "@/hooks/use-proposals";
import {
  ProposalState,
  splitDescription,
  stateLabel,
  STATE_TONES,
} from "@/lib/proposals";
import { formatToken, shortAddress, shortId } from "@/lib/format";

export function ProposalsView() {
  const proposalsQuery = useProposals();
  const records = useMemo(() => proposalsQuery.data ?? [], [proposalsQuery.data]);

  const ids = useMemo(() => records.map((r) => r.id), [records]);
  const summaries = useProposalSummaries(ids);

  const isLoading = proposalsQuery.isLoading;
  const isError = proposalsQuery.isError;
  const isEmpty = !isLoading && !isError && records.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">Proposals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discovered from <span className="font-mono">ProposalCreated</span> events on the DAOGovernor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isError ? <Badge tone="danger">Failed to load</Badge> : null}
          <Button variant="secondary" onClick={() => proposalsQuery.refetch()} disabled={proposalsQuery.isFetching}>
            {proposalsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Link href="/proposals/new">
            <Button>New proposal</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardHeader title="Could not load proposals" description="The event scan failed to reach Arbitrum Sepolia." />
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {proposalsQuery.error instanceof Error
              ? proposalsQuery.error.message
              : "Try refreshing. If the problem persists, the public RPC may be rate-limiting eth_getLogs."}
          </p>
        </Card>
      ) : isEmpty ? (
        <Card>
          <CardHeader title="No proposals yet" description="Nobody has submitted a proposal to this Governor." />
          <div className="px-5 py-6">
            <p className="text-sm text-muted-foreground">
              Create the first proposal. You need voting power that meets the proposal threshold — delegate your DGT
              to yourself first, then wait one block.
            </p>
            <Link href="/proposals/new" className="mt-3 inline-block">
              <Button>Create a proposal</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((record) => {
            const summary = summaries.summaries.get(record.id);
            const state = summary?.state;
            const votes = summary?.votes;
            const title = splitDescription(record.description).title;
            const tone = state === undefined ? "neutral" : STATE_TONES[state] ?? "neutral";
            const totalVotes = votes ? votes[0] + votes[1] + votes[2] : undefined;
            const active = state === ProposalState.Active;

            return (
              <li key={record.id.toString()}>
                <Link href={`/proposals/${record.id.toString()}`} className="block">
                  <Card className="transition-colors hover:border-primary/40">
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">#{shortId(record.id)}</span>
                          <span aria-hidden>·</span>
                          <span>by {shortAddress(record.proposer)}</span>
                          {active ? <Badge tone="accent">Active</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {votes
                            ? `For ${formatToken(votes[1])} · Against ${formatToken(votes[0])} · Abstain ${formatToken(votes[2])}`
                            : totalVotes !== undefined
                              ? `${formatToken(totalVotes)} total votes`
                              : "Vote totals unavailable"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        <Badge tone={tone}>{stateLabel(state)}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
