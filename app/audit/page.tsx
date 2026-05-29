import { Suspense } from "react";
import AuditHistoryClient from "./AuditHistoryClient";

export const metadata = {
  title: "Site Audit | AEOCheck",
  description: "Run a full multi-page AEO audit across your website.",
};

export default function AuditPage() {
  return (
    <Suspense>
      <AuditHistoryClient />
    </Suspense>
  );
}
