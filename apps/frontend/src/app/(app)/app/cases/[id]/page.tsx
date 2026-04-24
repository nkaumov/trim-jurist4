import { CaseDetailsTabs } from "./ui/case-details";

export default function CasePage({ params }: { params: { id: string } }) {
  return <CaseDetailsTabs caseId={params.id} />;
}

