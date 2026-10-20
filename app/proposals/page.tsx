import type { Metadata } from "next";
import { ProposalsView } from "@/components/proposals-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Proposals · DAO Governance",
  description: "All governance proposals discovered from the DAOGovernor on Arbitrum Sepolia.",
};

export default function ProposalsPage() {
  return (
    <PageShell>
      <ProposalsView />
    </PageShell>
  );
}
