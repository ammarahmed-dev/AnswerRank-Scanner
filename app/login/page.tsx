import { Suspense } from "react";
import AuthPageClient from "../components/AuthPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient mode="login" />
    </Suspense>
  );
}
