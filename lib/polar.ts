// Polar client - May 2026
export const POLAR_SERVER = process.env.POLAR_SERVER === "production"
  ? "production"
  : "sandbox";

export const POLAR_BASE_URL = POLAR_SERVER === "production"
  ? "https://api.polar.sh"
  : "https://sandbox-api.polar.sh";
