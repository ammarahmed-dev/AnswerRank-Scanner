import { Suspense } from "react";
import AuthPageClient from "../components/AuthPageClient";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient mode="signup" />
    </Suspense>
  );
}
