import { lookup } from "dns/promises";
import { isIP } from "net";

// Guards outbound requests to user-supplied URLs (SSRF protection).
// Every hop of a redirect chain must pass assertPublicUrl; use safeFetch for that.

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inIpv4Cidr(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_IPV4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_CIDRS.some(([base, bits]) => inIpv4Cidr(ip, base, bits));
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  // IPv4-mapped / IPv4-compatible / NAT64 forms: check the embedded IPv4 address.
  const embedded = lower.match(/^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) return isPrivateIpv4(embedded[1]);
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const firstHextet = parseInt(lower.split(":")[0] || "0", 16);
  if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // not an IP at all: treat as unsafe
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

export async function assertPublicUrl(input: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP/HTTPS URLs allowed");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  if (parsed.port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
    throw new Error("Only standard web ports are allowed");
  }

  const hostname = stripBrackets(parsed.hostname.toLowerCase()).replace(/\.$/, "");
  if (!hostname) throw new Error("Invalid URL");
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("Private hosts are not allowed");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private IP ranges not allowed");
    return parsed;
  }

  let addresses: Array<{ address: string }> = [];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    // Unresolvable host: the fetch itself will fail, nothing private to reach.
    return parsed;
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("URL resolves to private IP range");
  }
  return parsed;
}

type SafeFetchInit = Omit<RequestInit, "redirect"> & { maxRedirects?: number };

/**
 * fetch() that validates the initial URL and every redirect target before requesting it.
 * Returns the final response; `response.url` may be empty, so the final URL is returned too.
 */
export async function safeFetch(input: string, init: SafeFetchInit = {}): Promise<{ response: Response; finalUrl: string }> {
  const { maxRedirects = 5, ...rest } = init;
  let currentUrl = input;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(currentUrl);
    const response = await fetch(currentUrl, { ...rest, redirect: "manual" });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      if (hop === maxRedirects) throw new Error("Redirect limit reached");
      currentUrl = new URL(response.headers.get("location") as string, currentUrl).toString();
      await response.body?.cancel().catch(() => undefined);
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error("Redirect limit reached");
}
