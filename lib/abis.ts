import { parseAbi } from "viem";

// Minimal ABIs. Signatures come from the repository's Solidity sources and the
// OpenZeppelin v5 contracts they inherit from (ERC20Votes, Governor +
// extensions, TimelockController, Ownable). Every function listed here was
// checked against the deployed bytecode on Arbitrum Sepolia.

// Custom errors that can surface from any governance transaction. Timelock and
// ExecutionTarget reverts bubble up through Governor.execute, so every ABI that
// is simulated includes the full set to let viem decode the revert reason.
const governanceErrors = [
  // Governor
  "error GovernorInvalidProposalLength(uint256 targets, uint256 calldatas, uint256 values)",
  "error GovernorAlreadyCastVote(address voter)",
  "error GovernorDisabledDeposit()",
  "error GovernorOnlyExecutor(address account)",
  "error GovernorNonexistentProposal(uint256 proposalId)",
  "error GovernorUnexpectedProposalState(uint256 proposalId, uint8 current, bytes32 expectedStates)",
  "error GovernorInvalidVotingPeriod(uint256 votingPeriod)",
  "error GovernorInsufficientProposerVotes(address proposer, uint256 votes, uint256 threshold)",
  "error GovernorRestrictedProposer(address proposer)",
  "error GovernorInvalidVoteType()",
  "error GovernorInvalidVoteParams()",
  "error GovernorQueueNotImplemented()",
  "error GovernorNotQueuedProposal(uint256 proposalId)",
  "error GovernorAlreadyQueuedProposal(uint256 proposalId)",
  "error GovernorInvalidSignature(address voter)",
  "error GovernorUnableToCancel(uint256 proposalId, address account)",
  // Votes / checkpoints
  "error ERC5805FutureLookup(uint256 timepoint, uint48 clock)",
  "error VotesExpiredSignature(uint256 expiry)",
  // TimelockController
  "error TimelockInvalidOperationLength(uint256 targets, uint256 payloads, uint256 values)",
  "error TimelockInsufficientDelay(uint256 delay, uint256 minDelay)",
  "error TimelockUnexpectedOperationState(bytes32 operationId, bytes32 expectedStates)",
  "error TimelockUnexecutedPredecessor(bytes32 predecessorId)",
  "error TimelockUnauthorizedCaller(address caller)",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
  // Ownable (ExecutionTarget) and low-level call failures
  "error OwnableUnauthorizedAccount(address account)",
  "error FailedCall()",
  "error InsufficientBalance(uint256 balance, uint256 needed)",
] as const;

export const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)",
  "function CLOCK_MODE() view returns (string)",
  ...governanceErrors,
]);

export const governorAbi = parseAbi([
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function token() view returns (address)",
  "function timelock() view returns (address)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorumNumerator() view returns (uint256)",
  "function quorumDenominator() view returns (uint256)",
  "function quorum(uint256 timepoint) view returns (uint256)",
  "function clock() view returns (uint48)",
  "function CLOCK_MODE() view returns (string)",
  "function COUNTING_MODE() pure returns (string)",
  "function getVotes(address account, uint256 timepoint) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalProposer(uint256 proposalId) view returns (address)",
  "function proposalEta(uint256 proposalId) view returns (uint256)",
  "function proposalNeedsQueuing(uint256 proposalId) view returns (bool)",
  "function getProposalId(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) view returns (uint256)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
  "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)",
  "function cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  ...governanceErrors,
]);

export const timelockAbi = parseAbi([
  "function getMinDelay() view returns (uint256)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
]);

export const executionTargetAbi = parseAbi([
  "function number() view returns (uint256)",
  "function owner() view returns (address)",
  "function setNumber(uint256 newNumber)",
  "function withdraw(address recipient, uint256 amount)",
]);

// keccak256 role identifiers from OpenZeppelin TimelockController.
export const TIMELOCK_ROLES = {
  PROPOSER: "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1",
  EXECUTOR: "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63",
  CANCELLER: "0xfd643c72710c63c0180259aba6b2d05451e3591a24e58b62239378085726f783",
} as const;
