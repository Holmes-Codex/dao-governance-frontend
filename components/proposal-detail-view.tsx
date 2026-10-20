"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { type Address } from "viem";
import { useConfig, useConnection } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";
import { TxStatus } from "@/components/tx-status";
import { Badge, Button, Card, CardHeader, Skeleton } from "@/components/ui";
import { useTransaction } from "@/hooks/use-transaction";
import { useProposalOnchain, useProposals } from "@/hooks/use-proposals";
import { governorAbi } from "@/lib/abis";
import { CONTRACTS, TARGET_CHAIN_ID, explorerAddressUrl, explorerTxUrl } from "@/lib/contracts";
import {
  estimateClockBlockTime,
  formatDateTime,
  formatRelative,
  formatToken,
  shortAddress,
  shortId,
} from "@/lib/format";
import {
  ProposalState,
  STATE_TONES,
  VoteSupport,
  decodeAction,
  hashDescription,
  splitDescription,
  stateLabel,
} from "@/lib/proposals";

export function ProposalDetailView() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id = useMemo(() => {
    if (!rawId || !/^\d+$/.test(rawId)) return undefined;
    try {
      return BigInt(rawId);
    } catch {
      return undefined;
    }
  }, [rawId]);

  if (id === undefined) {
    return (
      <Card>
        <CardHeader title="Invalid proposal ID" description="The URL does not contain a valid numeric proposal ID." />
        <div className="px-5 py-6">
          <Link href="/proposals" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to proposals
          </Link>
        </div>
      </Card>
    );
  }

  return <ProposalDetailContent id={id} />;
}

function ProposalDetailContent({ id }: { id: bigint }) {
  const { address } = useConnection();
  const config = useConfig();
  const proposalsQuery = useProposals();
  const onchain = useProposalOnchain(id, address);

  const record = useMemo(() => {
    const list = proposalsQuery.data ?? [];
    return list.find((r) => r.id === id);
  }, [proposalsQuery.data, id]);

  const voteTx = useTransaction();
  const actionTx = useTransaction();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const state = onchain.state;
  const votes = onchain.votes;
  const snapshot = onchain.snapshot;
  const deadline = onchain.deadline;
  const eta = onchain.eta;
  const needsQueuing = onchain.needsQueuing;
  const clock = onchain.clock;
  const nowSeconds = onchain.nowSeconds;
  const quorum = onchain.quorum;
  const votingPower = onchain.votingPower;
  const hasVoted = onchain.hasVoted;
  const proposer = onchain.proposer;

  const loading = onchain.isLoading && state === undefined;
  const stateNum = state;
  const stateText = stateLabel(stateNum);
  const tone = stateNum === undefined ? "neutral" : STATE_TONES[stateNum] ?? "neutral";

  const description = record?.description ?? "";
  const { title, body } = splitDescription(description);
  const descriptionHash = record?.descriptionHash ?? hashDescription(description);

  const actions = useMemo(() => {
    if (!record) return [];
    return record.targets.map((target, i) =>
      decodeAction(target, record.values[i] ?? 0n, record.calldatas[i] ?? "0x"),
    );
  }, [record]);

  const snapshotEstimate =
    snapshot !== undefined && clock !== undefined && nowSeconds !== undefined
      ? estimateClockBlockTime(snapshot, clock, nowSeconds)
      : undefined;
  const deadlineEstimate =
    deadline !== undefined && clock !== undefined && nowSeconds !== undefined
      ? estimateClockBlockTime(deadline, clock, nowSeconds)
      : undefined;

  const isActive = stateNum === ProposalState.Active;
  const isPending = stateNum === ProposalState.Pending;
  const isSucceeded = stateNum === ProposalState.Succeeded;
  const isQueued = stateNum === ProposalState.Queued;
  const isCanceled = stateNum === ProposalState.Canceled;
  const isDefeated = stateNum === ProposalState.Defeated;
  const isExpired = stateNum === ProposalState.Expired;
  const isExecuted = stateNum === ProposalState.Executed;

  const canVote = isActive && !!address && !hasVoted;
  const canQueue = isSucceeded && needsQueuing !== false;
  const canExecute = isQueued && eta !== undefined && nowSeconds !== undefined && eta <= nowSeconds;
  const canCancel = isPending && !!address && !!proposer && proposer.toLowerCase() === address.toLowerCase();

  const isProposerSelf = !!address && !!proposer && proposer.toLowerCase() === address.toLowerCase();

  const forVotes = votes?.for ?? 0n;
  const againstVotes = votes?.against ?? 0n;
  const abstainVotes = votes?.abstain ?? 0n;
  const totalVotes = forVotes + againstVotes + abstainVotes;
  const quorumReached = quorum !== undefined ? forVotes + abstainVotes >= quorum : undefined;

  function castVote(support: VoteSupportValue) {
    voteTx.run(async ({ account, markSigning }) => {
      const { request } = await simulateContract(config, {
        address: CONTRACTS.governor,
        abi: governorAbi,
        functionName: "castVote",
        args: [id, support],
        account,
        chainId: TARGET_CHAIN_ID,
      });
      markSigning();
      return writeContract(config, request);
    });
  }

  function runAction(
    name: string,
    functionName: "queue" | "execute" | "cancel",
  ) {
    if (!record) return;
    setPendingAction(name);
    actionTx.run(
      async ({ account, markSigning }) => {
        const { request } = await simulateContract(config, {
          address: CONTRACTS.governor,
          abi: governorAbi,
          functionName,
          args: [
            record.targets as Address[],
            record.values as bigint[],
            record.calldatas as `0x${string}`[],
            descriptionHash,
          ],
          account,
          chainId: TARGET_CHAIN_ID,
        });
        markSigning();
        return writeContract(config, request);
      },
      () => {
        onchain.refetch();
        proposalsQuery.refetch();
      },
    );
  }

  const actionBlocker = actionTx.blocker;
  const voteBlocker = voteTx.blocker;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/proposals" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Proposals
        </Link>
        <span aria-hidden className="text-muted-foreground">/</span>
        <span className="font-mono text-muted-foreground">#{shortId(id)}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-7 w-72" /> : title || "Untitled proposal"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? <Skeleton className="h-4 w-40" /> : `Proposal ID ${id.toString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{stateText}</Badge>
          <Button variant="secondary" onClick={() => onchain.refetch()} disabled={onchain.isFetching}>
            {onchain.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {onchain.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load proposal state from the Governor. The RPC may be unavailable.
        </div>
      ) : null}

      {record?.isReconstructed === false ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          This proposal&apos;s on-chain parameters could not be reconstructed from its event data. Queue, execute, and
          cancel are disabled because they require resubmitting the exact proposal parameters.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Description" />
          <div className="px-5 py-4">
            {body ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>
            ) : description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{description}</p>
            ) : !record && proposalsQuery.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <p className="text-sm text-muted-foreground">No description available.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <dl className="divide-y divide-border text-sm">
            <DetailRow label="Proposer" loading={loading}>
              {proposer ? (
                <a
                  href={explorerAddressUrl(proposer)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  {shortAddress(proposer)}
                </a>
              ) : record ? (
                <span className="font-mono text-xs">{shortAddress(record.proposer)}</span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Snapshot block" loading={loading}>
              {snapshot !== undefined ? snapshot.toLocaleString("en-US") : "—"}
              {snapshotEstimate !== undefined && nowSeconds ? (
                <span className="ml-1 text-xs text-muted-foreground">({formatRelative(snapshotEstimate, nowSeconds)})</span>
              ) : null}
            </DetailRow>
            <DetailRow label="Deadline block" loading={loading}>
              {deadline !== undefined ? deadline.toLocaleString("en-US") : "—"}
              {deadlineEstimate !== undefined && nowSeconds ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({isActive ? formatRelative(deadlineEstimate, nowSeconds) : "ended"})
                </span>
              ) : null}
            </DetailRow>
            <DetailRow label="Timelock ETA" loading={loading}>
              {eta !== undefined && eta > 0n
                ? nowSeconds
                  ? `${formatDateTime(eta)} (${formatRelative(eta, nowSeconds)})`
                  : formatDateTime(eta)
                : "—"}
            </DetailRow>
            <DetailRow label="Needs queuing" loading={loading}>
              {needsQueuing === undefined ? "—" : needsQueuing ? "Yes" : "No"}
            </DetailRow>
            <DetailRow label="Your voting power" loading={loading}>
              {address ? (votingPower !== undefined ? formatToken(votingPower) : "Not yet available") : "Connect wallet"}
            </DetailRow>
            <DetailRow label="Your vote" loading={loading}>
              {address ? (hasVoted ? "Cast" : isActive ? "Not voted" : "—") : "—"}
            </DetailRow>
          </dl>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Vote results"
          description={
            quorum !== undefined
              ? `Quorum ≈ ${formatToken(quorum)} DGT (For + Abstain). ${
                  quorumReached === undefined ? "" : quorumReached ? "Reached." : "Not reached."
                }`
              : "Quorum is available once the snapshot block is in the past."
          }
        />
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <VoteTally label="For" value={forVotes} loading={loading} tone="success" />
          <VoteTally label="Against" value={againstVotes} loading={loading} tone="danger" />
          <VoteTally label="Abstain" value={abstainVotes} loading={loading} tone="neutral" />
        </div>
        <div className="px-5 py-3 text-xs text-muted-foreground">
          {totalVotes > 0n ? (
            <>
              <BarChart against={againstVotes} forVotes={forVotes} abstain={abstainVotes} total={totalVotes} />
              <p className="mt-2">{formatToken(totalVotes)} DGT total voted.</p>
            </>
          ) : loading ? (
            "Loading vote totals…"
          ) : (
            "No votes cast yet."
          )}
        </div>
      </Card>

      {actions.length > 0 ? (
        <Card>
          <CardHeader title="Proposed actions" description="Calls that will run if the proposal is executed." />
          <ul className="divide-y divide-border text-sm">
            {actions.map((action, i) => (
              <li key={i} className="flex flex-col gap-1 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">{action.summary}</span>
                  {action.value > 0n ? <Badge tone="warning">Sends ETH</Badge> : null}
                </div>
                <a
                  href={explorerAddressUrl(action.target)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {action.target}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {record?.transactionHash ? (
        <Card>
          <CardHeader title="Creation" />
          <p className="px-5 py-3 text-sm">
            <a
              href={explorerTxUrl(record.transactionHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-primary underline-offset-4 hover:underline"
            >
              View creation transaction on Arbiscan
            </a>
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Actions" description="Governance transactions are simulated before they reach your wallet." />
        <div className="flex flex-col gap-4 px-5 py-4">
          {isCanceled || isDefeated || isExpired || isExecuted ? (
            <p className="text-sm text-muted-foreground">
              {isCanceled
                ? "This proposal was canceled."
                : isDefeated
                  ? "This proposal was defeated — quorum was not reached or Against votes exceeded For votes."
                  : isExpired
                    ? "This proposal expired before it was executed."
                    : "This proposal has been executed."}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => castVote(VoteSupport.For)}
              disabled={!canVote || voteTx.isBusy || !!voteBlocker}
              title={!canVote ? voteDisabledReason(isActive, hasVoted, !!address) : undefined}
            >
              Vote For
            </Button>
            <Button
              variant="secondary"
              onClick={() => castVote(VoteSupport.Against)}
              disabled={!canVote || voteTx.isBusy || !!voteBlocker}
              title={!canVote ? voteDisabledReason(isActive, hasVoted, !!address) : undefined}
            >
              Vote Against
            </Button>
            <Button
              variant="secondary"
              onClick={() => castVote(VoteSupport.Abstain)}
              disabled={!canVote || voteTx.isBusy || !!voteBlocker}
              title={!canVote ? voteDisabledReason(isActive, hasVoted, !!address) : undefined}
            >
              Abstain
            </Button>
          </div>
          {!canVote && !voteTx.isBusy && isActive ? (
            <p className="text-xs text-muted-foreground">
              {voteBlocker ?? voteDisabledReason(isActive, hasVoted, !!address)}
            </p>
          ) : null}
          {voteTx.blocker && voteTx.phase === "idle" && !isActive ? (
            <p className="text-xs text-muted-foreground">{voteTx.blocker}</p>
          ) : null}
          <TxStatus tx={voteTx} successText="Vote cast. Vote totals update after the next block." />

          <div className="my-2 border-t border-border" />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runAction("Queue", "queue")}
              disabled={!canQueue || actionTx.isBusy || !!actionBlocker || record?.isReconstructed === false}
              title={actionDisabledReason("queue", canQueue, stateNum)}
            >
              Queue
            </Button>
            <Button
              onClick={() => runAction("Execute", "execute")}
              disabled={!canExecute || actionTx.isBusy || !!actionBlocker || record?.isReconstructed === false}
              title={actionDisabledReason("execute", canExecute, stateNum, eta, nowSeconds)}
            >
              Execute
            </Button>
            <Button
              variant="secondary"
              onClick={() => runAction("Cancel", "cancel")}
              disabled={!canCancel || actionTx.isBusy || !!actionBlocker || record?.isReconstructed === false}
              title={actionDisabledReason("cancel", canCancel, stateNum)}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {actionHelp(stateNum, canQueue, canExecute, canCancel, needsQueuing, eta, nowSeconds, isProposerSelf)}
          </p>
          {actionTx.blocker && actionTx.phase === "idle" ? (
            <p className="text-xs text-muted-foreground">{actionTx.blocker}</p>
          ) : null}
          <TxStatus
            tx={actionTx}
            successText={`${pendingAction ?? "Action"} confirmed. The proposal state has been updated.`}
          />
        </div>
      </Card>
    </div>
  );
}

function voteDisabledReason(isActive: boolean, hasVoted: boolean | undefined, hasAddress: boolean): string {
  if (!hasAddress) return "Connect a wallet to vote.";
  if (!isActive) return "Voting is only available while the proposal is Active.";
  if (hasVoted) return "This address has already voted on this proposal.";
  return "Voting is not available right now.";
}

function actionDisabledReason(
  kind: "queue" | "execute" | "cancel",
  can: boolean,
  state: number | undefined,
  eta?: bigint,
  now?: bigint,
): string {
  if (can) return "";
  if (kind === "queue") {
    if (state !== ProposalState.Succeeded) return "Queue is only available when the proposal has Succeeded.";
    return "Queuing is not required for this proposal.";
  }
  if (kind === "execute") {
    if (state !== ProposalState.Queued) return "Execute is only available when the proposal is Queued.";
    if (eta !== undefined && now !== undefined && eta > now)
      return "The Timelock delay has not elapsed yet.";
    return "Execute is not available right now.";
  }
  if (kind === "cancel") return "Cancel is only available to the proposer while the proposal is Pending.";
  return "This action is not available.";
}

function actionHelp(
  state: number | undefined,
  canQueue: boolean,
  canExecute: boolean,
  canCancel: boolean,
  needsQueuing: boolean | undefined,
  eta: bigint | undefined,
  now: bigint | undefined,
  isProposerSelf: boolean,
): string {
  if (state === undefined) return "Loading proposal state…";
  if (state === ProposalState.Pending) {
    if (canCancel) return "You can cancel this proposal while it remains Pending.";
    return isProposerSelf
      ? "Voting has not started yet."
      : "Voting has not started yet. Only the proposer can cancel while Pending.";
  }
  if (state === ProposalState.Active) return "Voting is open. Queue and execute become available after voting ends.";
  if (state === ProposalState.Succeeded) {
    if (canQueue) return "The proposal passed. Queue it to start the Timelock delay.";
    if (needsQueuing === false) return "The proposal passed and does not need queuing — execute it directly.";
    return "The proposal passed.";
  }
  if (state === ProposalState.Queued) {
    if (canExecute) return "The Timelock delay has elapsed — execute the proposal now.";
    if (eta !== undefined && now !== undefined && eta > now)
      return `The Timelock delay ends ${formatRelative(eta, now)}. Execute after that.`;
    return "The proposal is queued.";
  }
  if (state === ProposalState.Defeated) return "The proposal was defeated and cannot be queued or executed.";
  if (state === ProposalState.Canceled) return "The proposal was canceled.";
  if (state === ProposalState.Expired) return "The proposal expired before it was executed.";
  if (state === ProposalState.Executed) return "The proposal has been executed.";
  return "";
}

function DetailRow({
  label,
  children,
  loading,
}: {
  label: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-mono tabular-nums">
        {loading ? <Skeleton className="ml-auto h-4 w-24" /> : children}
      </dd>
    </div>
  );
}

function VoteTally({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: bigint;
  loading: boolean;
  tone: "success" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-mono text-lg font-medium tabular-nums ${toneClass}`}>
        {loading ? <Skeleton className="h-6 w-24" /> : formatToken(value)}
      </dd>
    </div>
  );
}

function BarChart({
  against,
  forVotes,
  abstain,
  total,
}: {
  against: bigint;
  forVotes: bigint;
  abstain: bigint;
  total: bigint;
}) {
  if (total === 0n) return null;
  const pct = (v: bigint) => `${(Number((v * 1000n) / total) / 10).toFixed(1)}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-border" role="img" aria-label="Vote distribution">
      {forVotes > 0n ? (
        <span className="bg-success" style={{ width: pct(forVotes) }} title={`For ${pct(forVotes)}`} />
      ) : null}
      {abstain > 0n ? (
        <span className="bg-muted-foreground" style={{ width: pct(abstain) }} title={`Abstain ${pct(abstain)}`} />
      ) : null}
      {against > 0n ? (
        <span className="bg-destructive" style={{ width: pct(against) }} title={`Against ${pct(against)}`} />
      ) : null}
    </div>
  );
}

type VoteSupportValue = (typeof VoteSupport)[keyof typeof VoteSupport];
