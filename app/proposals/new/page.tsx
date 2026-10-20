import type { Metadata } from "next";
import { NewProposalView } from "@/components/new-proposal-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "New proposal · DAO Governance",
  description: "Submit a new governance proposal to the DAOGovernor on Arbitrum Sepolia.",
};

export default function NewProposalPage() {
  return (
    <PageShell>
      <NewProposalView />
    </PageShell>
  );
}
