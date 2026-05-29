import { Resolver } from "dns/promises";

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export async function validatePublicUrl(input: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs allowed");
  }

  const hostname = parsed.hostname;

  if (PRIVATE_RANGES.some(r => r.test(hostname))) {
    throw new Error("Private IP ranges not allowed");
  }

  try {
    const resolver = new Resolver();
    const addresses = await resolver.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await resolver.resolve6(hostname).catch(() => [] as string[]);
    const all = [...addresses, ...addresses6];
    for (const ip of all) {
      if (PRIVATE_RANGES.some(r => r.test(ip))) {
        throw new Error("URL resolves to private IP range");
      }
    }
  } catch (e) {
    if ((e as Error).message.includes("private IP")) throw e;
    // DNS resolution failure is acceptable - let the fetch fail naturally
  }
}
