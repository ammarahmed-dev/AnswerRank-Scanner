"use client";

import { useState } from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  reportId?: string;
  reportUrl?: string;
  checkoutType?: "full_report" | "pro_plan";
  disabled?: boolean;
};

export default function UpgradeButton({
  children = "Upgrade plan",
  className = "btn btn-primary",
  reportId: _reportId,
  reportUrl: _reportUrl,
  checkoutType: _checkoutType = "full_report",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    window.location.href = "/contact?subject=upgrade";
  };

  return (
    <button type="button" onClick={handleUpgrade} disabled={loading || disabled} className={className}>
      {loading ? "Opening contact form" : children}
    </button>
  );
}

