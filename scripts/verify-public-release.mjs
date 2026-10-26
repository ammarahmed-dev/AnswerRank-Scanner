// Read-only production health gate for the deployed main commit.
const base = "https://www.aeocheck.co";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha = process.env.GITHUB_SHA;
if (!sha || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("Missing release SHA");
const statusUrl = "https://api.github.com/repos/ammarahmed-dev/AnswerRank-Scanner/commits/" + sha + "/status";
let ready = false;
for (let attempt = 0; attempt < 18; attempt++) {
  const response = await fetch(statusUrl, { signal: AbortSignal.timeout(10000), headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error("Deployment status unavailable: " + response.status);
  const data = await response.json();
  const status = data.statuses?.find(item => item.context === "Vercel");
  if (status?.state === "success") { ready = true; break; }
  if (status?.state === "failure" || status?.state === "error") throw new Error("Vercel deployment failed");
  await pause(10000);
}
if (!ready) throw new Error("Deployment verification deadline exceeded");
for (const path of ["/", "/pricing", "/blog", "/api/stats", "/sample-report", "/services/aeo-geo-implementation"]) {
  let ok = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(base + path, { redirect: "error", signal: AbortSignal.timeout(10000) });
      const valid = response.status === 200 && response.headers.get("content-type")?.includes(path === "/api/stats" ? "application/json" : "text/html");
      await response.body?.cancel();
      if (valid) { ok = true; break; }
    } catch { /* Retry transient transport errors within the bounded check. */ }
    await pause(2000);
  }
  if (!ok) throw new Error("Public route verification failed: " + path);
  console.log("Verified public route: " + path);
}
console.log("Public release health verified for " + sha + "; live provider and signed-in acceptance remain separate.");
