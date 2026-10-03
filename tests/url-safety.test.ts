import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "@/lib/url-safety";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0",
    "100.64.0.1", "224.0.0.1", "::1", "::", "fd00::1", "fc00::1", "fe80::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::10.0.0.1",
  ])("blocks %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    }
  );

  it("treats non-IPs as unsafe", () => {
    expect(isPrivateAddress("example.com")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  it.each([
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://169.254.169.254/latest/meta-data",
    "http://localhost/",
    "http://printer.local/",
    "http://service.internal/",
    "http://user:pass@93.184.215.14/",
    "http://93.184.215.14:22/",
    "ftp://93.184.215.14/",
    "not a url",
  ])("rejects %s", async (url) => {
    await expect(assertPublicUrl(url)).rejects.toThrow();
  });

  it("accepts public IP literals on standard ports", async () => {
    await expect(assertPublicUrl("https://93.184.215.14/")).resolves.toBeInstanceOf(URL);
    await expect(assertPublicUrl("http://93.184.215.14:8080/")).resolves.toBeInstanceOf(URL);
  });
});
