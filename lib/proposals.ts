import {
  decodeFunctionData,
  encodeAbiParameters,
  formatEther,
  getAbiItem,
  hexToBigInt,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { executionTargetAbi, governorAbi } from "./abis";
import { CONTRACTS, GOVERNOR_DEPLOY_BLOCK } from "./contracts";

// OpenZeppelin IGovernor.ProposalState order.
export const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
} as const;

export const STATE_LABELS = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;

export const STATE_TONES = [
  "neutral",
  "accent",
  "neutral",
  "danger",
  "success",
  "warning",
  "neutral",
  "success",
] as const;

export function stateLabel(state?: number) {
  return state === undefined ? "Unknown" : (STATE_LABELS[state] ?? `State ${state}`);
}

// GovernorCountingSimple: 0 = Against, 1 = For, 2 = Abstain.
export const VoteSupport = { Against: 0, For: 1, Abstain: 2 } as const;
export type VoteSupportValue = (typeof VoteSupport)[keyof typeof VoteSupport];

export type ProposalRecord = {
  id: bigint;
  proposer: Address;
  targets: readonly Address[];
  values: readonly bigint[];
  calldatas: readonly Hex[];
  voteStart: bigint;
  voteEnd: bigint;
  description: string;
  descriptionHash: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  // True only when hashing the event's targets, values, calldatas and
  // description reproduces the proposal ID exactly. Queue, execute and cancel
  // resubmit this data, so they stay disabled unless this is true.
  isReconstructed: boolean;
};

// Matches Governor: keccak256(bytes(description)) over the exact UTF-8 bytes,
// so line breaks and non-ASCII characters are preserved.
export function hashDescription(description: string): Hex {
  return keccak256(stringToBytes(description));
}

// Matches Governor.hashProposal / getProposalId (checked on-chain).
export function computeProposalId(
  targets: readonly Address[],
  values: readonly bigint[],
  calldatas: readonly Hex[],
  descriptionHash: Hex,
): bigint {
  return hexToBigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "address[]" }, { type: "uint256[]" }, { type: "bytes[]" }, { type: "bytes32" }],
        [targets, values, calldatas, descriptionHash],
      ),
    ),
  );
}

const proposalCreatedEvent = getAbiItem({ abi: governorAbi, name: "ProposalCreated" });

// Public Arbitrum Sepolia RPCs reject eth_getLogs over very large ranges, so
// the scan is split into fixed-size chunks with limited parallelism.
const LOG_CHUNK_SIZE = 100_000n;
const LOG_CONCURRENCY = 4;

export async function fetchProposals(client: PublicClient): Promise<ProposalRecord[]> {
  const latest = await client.getBlockNumber();
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let from = GOVERNOR_DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK_SIZE) {
    const to = from + LOG_CHUNK_SIZE - 1n;
    ranges.push({ fromBlock: from, toBlock: to > latest ? latest : to });
  }

  const records: ProposalRecord[] = [];
  for (let i = 0; i < ranges.length; i += LOG_CONCURRENCY) {
    const batch = await Promise.all(
      ranges.slice(i, i + LOG_CONCURRENCY).map((range) =>
        client.getLogs({ address: CONTRACTS.governor, event: proposalCreatedEvent, strict: true, ...range }),
      ),
    );
    for (const log of batch.flat()) {
      const { proposalId, proposer, targets, values, calldatas, voteStart, voteEnd, description } = log.args;
      const descriptionHash = hashDescription(description);
      const lengthsMatch = targets.length === values.length && targets.length === calldatas.length;
      records.push({
        id: proposalId,
        proposer,
        targets,
        values,
        calldatas,
        voteStart,
        voteEnd,
        description,
        descriptionHash,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        isReconstructed:
          lengthsMatch && computeProposalId(targets, values, calldatas, descriptionHash) === proposalId,
      });
    }
  }

  return records.sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1));
}

export function splitDescription(description: string) {
  const lines = description.split(/\r?\n/);
  const firstIndex = lines.findIndex((line) => line.trim() !== "");
  if (firstIndex === -1) return { title: "Untitled proposal", body: "" };
  const title = lines[firstIndex].replace(/^#+\s*/, "").trim() || "Untitled proposal";
  const body = lines
    .slice(firstIndex + 1)
    .join("\n")
    .trim();
  return { title, body };
}

export function composeDescription(title: string, details: string) {
  const heading = `# ${title.trim()}`;
  const body = details.trim();
  return body ? `${heading}\n\n${body}` : heading;
}

export type DecodedAction = {
  target: Address;
  value: bigint;
  calldata: Hex;
  isExecutionTarget: boolean;
  summary: string;
};

export function decodeAction(target: Address, value: bigint, calldata: Hex): DecodedAction {
  const isExecutionTarget = target.toLowerCase() === CONTRACTS.executionTarget.toLowerCase();
  const valueSuffix = value > 0n ? ` (sending ${formatEther(value)} ETH)` : "";
  if (isExecutionTarget) {
    try {
      const decoded = decodeFunctionData({ abi: executionTargetAbi, data: calldata });
      if (decoded.functionName === "setNumber") {
        return { target, value, calldata, isExecutionTarget, summary: `setNumber(${decoded.args[0]})${valueSuffix}` };
      }
      if (decoded.functionName === "withdraw") {
        const [recipient, amount] = decoded.args;
        return {
          target,
          value,
          calldata,
          isExecutionTarget,
          summary: `withdraw ${formatEther(amount)} ETH to ${recipient}${valueSuffix}`,
        };
      }
    } catch {
      // Fall through to the raw summary below.
    }
  }
  const selector = calldata.length >= 10 ? calldata.slice(0, 10) : calldata === "0x" ? "no calldata" : calldata;
  return { target, value, calldata, isExecutionTarget, summary: `Call ${selector}${valueSuffix}` };
}
