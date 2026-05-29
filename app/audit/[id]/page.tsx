import { Suspense } from "react";
import AuditClient from "./AuditClient";

export const metadata = {
  title: "Audit Results | AEOCheck",
};

export default function AuditResultPage() {
  return (
    <Suspense>
      <AuditClient />
    </Suspense>
  );
}
