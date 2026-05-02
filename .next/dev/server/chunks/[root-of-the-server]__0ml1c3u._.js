module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/analyze/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/lib/scrape'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/score'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/pagespeed'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/openai'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
;
;
;
function errorResponse(error, status, details) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error,
        details
    }, {
        status
    });
}
async function POST(req) {
    try {
        const body = await req.json();
        const rawUrl = body?.url;
        if (!rawUrl || typeof rawUrl !== "string") {
            return errorResponse("Please provide a valid URL.", 400);
        }
        let normalizedUrl = "";
        try {
            normalizedUrl = normalizeUrl(rawUrl);
        } catch  {
            return errorResponse("Invalid URL. Enter a public website URL like https://example.com.", 400);
        }
        if (!validateUrl(normalizedUrl)) {
            return errorResponse("Invalid URL. Only public http(s) URLs are supported.", 400);
        }
        let html = "";
        try {
            html = await fetchHtml(normalizedUrl);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
                return errorResponse("Request timed out while fetching this URL.", 408);
            }
            if (message.toLowerCase().includes("blocked")) {
                return errorResponse("This website blocked the scanner. Try a public marketing page or a different URL.", 422, message);
            }
            return errorResponse("Could not fetch this website. It may block bots or be unavailable.", 422, message);
        }
        if (!html.trim()) {
            return errorResponse("Website returned empty HTML. Try another page URL.", 422);
        }
        const extractedData = parseHtml(html, normalizedUrl);
        if (!extractedData.bodyText && !extractedData.pageTitle && !extractedData.metaDescription) {
            return errorResponse("Could not extract meaningful content from this page.", 422);
        }
        const pageSpeedResult = await getPageSpeedScore(normalizedUrl);
        const pageSpeedScore = pageSpeedResult.score;
        const scores = calculateScores(extractedData, pageSpeedScore);
        let aiAnalysis;
        let aiProvider = "fallback";
        const integrationNotes = [];
        try {
            if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
                const aiResult = await analyzeWithAI(extractedData);
                aiAnalysis = aiResult.analysis;
                aiProvider = aiResult.provider;
                if (process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY && aiProvider === "gemini") {
                    integrationNotes.push("OpenAI was configured but did not complete successfully, so Gemini was used as the AI fallback provider.");
                }
            } else {
                aiAnalysis = getFallbackAnalysis(extractedData, scores);
                integrationNotes.push("No AI API key configured, so deterministic fallback recommendations were used.");
            }
        } catch (err) {
            aiAnalysis = getFallbackAnalysis(extractedData, scores);
            aiProvider = "fallback";
            const message = err instanceof Error ? err.message : "Unknown AI provider error";
            integrationNotes.push(`AI provider failed, so deterministic fallback recommendations were used. ${message}`);
        }
        if (pageSpeedScore === null) {
            integrationNotes.push(`${pageSpeedResult.error ?? "Google PageSpeed did not return a score."} Performance used fallback heuristics.`);
        }
        const report = {
            url: normalizedUrl,
            extractedData,
            scores,
            aiAnalysis,
            pageSpeedScore,
            integrations: {
                aiProvider,
                aiPowered: aiProvider !== "fallback",
                pageSpeedProvider: pageSpeedScore === null ? "fallback" : "google",
                pageSpeedMeasured: pageSpeedScore !== null,
                notes: integrationNotes
            },
            analysisTimestamp: new Date().toISOString()
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(report, {
            status: 200
        });
    } catch (err) {
        console.error("Analyze route error:", err);
        return errorResponse("An unexpected error occurred. Please try again.", 500);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ml1c3u._.js.map