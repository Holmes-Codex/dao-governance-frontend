import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalDetailView } from "@/components/proposal-detail-view";
import { PageShell } from "@/components/page-shell";
import { Badge, Card, CardHeader, Skeleton } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "Proposal · DAO Governance",
  description: "Proposal state, votes, and governance actions on Arbitrum Sepolia.",
};

export default function ProposalDetailPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Proposals</span>
              <span aria-hidden className="text-muted-foreground">/</span>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-72" />
              <Badge tone="neutral">Loading</Badge>
            </div>
            <Card>
              <CardHeader title="Loading proposal…" />
              <div className="px-5 py-6">
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          </div>
        }
      >
        <ProposalDetailView />
      </Suspense>
    </PageShell>
  );
}
