import { redirect } from "next/navigation";

// Legacy Polar return URL. Lemon Squeezy checkouts return to /dashboard?upgraded=1,
// so keep old links working by sending them there.
export default function UpgradeSuccessPage() {
  redirect("/dashboard?upgraded=1");
}
