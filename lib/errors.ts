import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { formatToken } from "./format";
import { stateLabel } from "./proposals";

type RevertArgs = readonly unknown[] | undefined;

const REVERT_MESSAGES: Record<string, (args: RevertArgs) => string> = {
  GovernorInsufficientProposerVotes: (args) =>
    `Your voting power (${formatToken(args?.[1] as bigint)} DGT) is below the proposal threshold (${formatToken(args?.[2] as bigint)} DGT). Delegate to yourself first, then wait one block.`,
  GovernorAlreadyCastVote: () => "This address has already voted on this proposal.",
  GovernorUnexpectedProposalState: (args) =>
    `The proposal is currently ${stateLabel(Number(args?.[1]))}, so this action is not available.`,
  GovernorNonexistentProposal: () => "This proposal does not exist on the Governor.",
  GovernorUnableToCancel: () => "Only the proposer can cancel, and only while the proposal is Pending or Active.",
  GovernorRestrictedProposer: () => "This description restricts who may submit the proposal.",
  GovernorInvalidProposalLength: () => "Targets, values and calldata must have the same length.",
  GovernorInvalidVoteType: () => "Invalid vote option.",
  GovernorNotQueuedProposal: () => "The proposal has not been queued yet.",
  GovernorAlreadyQueuedProposal: () => "The proposal is already queued.",
  ERC5805FutureLookup: () => "Voting has not started yet: the snapshot block is still in the future.",
  TimelockUnexpectedOperationState: () =>
    "The Timelock operation is not ready. The delay may not have passed yet, or it was already executed.",
  TimelockInsufficientDelay: () => "The Timelock rejected the delay.",
  TimelockUnexecutedPredecessor: () => "A required earlier Timelock operation has not been executed.",
  TimelockUnauthorizedCaller: () => "The Timelock rejected the caller.",
  AccessControlUnauthorizedAccount: () => "The caller lacks the required Timelock role.",
  OwnableUnauthorizedAccount: () => "ExecutionTarget only accepts calls from its owner (the Timelock).",
  FailedCall: () => "A call inside the proposal failed.",
  InsufficientBalance: () => "Not enough ETH to make the call.",
};

const REASON_MESSAGES: Record<string, string> = {
  "Insufficient balance": "ExecutionTarget does not hold enough ETH for this withdrawal.",
  "Invalid recipient": "The withdrawal recipient cannot be the zero address.",
  "ETH transfer failed": "The recipient rejected the ETH transfer.",
};

export function describeError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Request rejected in your wallet.";
    }
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && REVERT_MESSAGES[name]) return REVERT_MESSAGES[name](revert.data?.args);
      if (revert.reason) return REASON_MESSAGES[revert.reason] ?? `Reverted: ${revert.reason}`;
      if (name) return `Reverted with ${name}.`;
    }
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
