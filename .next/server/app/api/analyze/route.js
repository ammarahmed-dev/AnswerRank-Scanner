/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/analyze/route";
exports.ids = ["app/api/analyze/route"];
exports.modules = {

/***/ "(rsc)/./app/api/analyze/route.ts":
/*!**********************************!*\
  !*** ./app/api/analyze/route.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_scrape__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/scrape */ \"(rsc)/./lib/scrape.ts\");\n/* harmony import */ var _lib_score__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/score */ \"(rsc)/./lib/score.ts\");\n/* harmony import */ var _lib_pagespeed__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/pagespeed */ \"(rsc)/./lib/pagespeed.ts\");\n/* harmony import */ var _lib_openai__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/lib/openai */ \"(rsc)/./lib/openai.ts\");\n\n\n\n\n\nasync function POST(req) {\n    try {\n        const body = await req.json();\n        const rawUrl = body?.url;\n        if (!rawUrl || typeof rawUrl !== \"string\") {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Please provide a valid URL.\"\n            }, {\n                status: 400\n            });\n        }\n        const normalizedUrl = (0,_lib_scrape__WEBPACK_IMPORTED_MODULE_1__.normalizeUrl)(rawUrl);\n        if (!(0,_lib_scrape__WEBPACK_IMPORTED_MODULE_1__.validateUrl)(normalizedUrl)) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Invalid URL. Only http:// and https:// URLs are supported.\"\n            }, {\n                status: 400\n            });\n        }\n        // Fetch HTML\n        let html;\n        try {\n            html = await (0,_lib_scrape__WEBPACK_IMPORTED_MODULE_1__.fetchHtml)(normalizedUrl);\n        } catch (err) {\n            const message = err instanceof Error ? err.message : \"Unknown error\";\n            if (message.includes(\"aborted\")) {\n                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                    error: \"Request timed out. The website took too long to respond.\"\n                }, {\n                    status: 408\n                });\n            }\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Could not fetch the website. It may be blocking crawlers or unavailable.\",\n                details: message\n            }, {\n                status: 422\n            });\n        }\n        // Parse HTML\n        const extractedData = (0,_lib_scrape__WEBPACK_IMPORTED_MODULE_1__.parseHtml)(html, normalizedUrl);\n        // PageSpeed (optional)\n        const pageSpeedScore = await (0,_lib_pagespeed__WEBPACK_IMPORTED_MODULE_3__.getPageSpeedScore)(normalizedUrl);\n        // Calculate scores\n        const scores = (0,_lib_score__WEBPACK_IMPORTED_MODULE_2__.calculateScores)(extractedData, pageSpeedScore);\n        // AI analysis (optional)\n        let aiAnalysis;\n        if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {\n            try {\n                aiAnalysis = await (0,_lib_openai__WEBPACK_IMPORTED_MODULE_4__.analyzeWithAI)(extractedData);\n            } catch (err) {\n                console.error(\"OpenAI error:\", err);\n                aiAnalysis = (0,_lib_score__WEBPACK_IMPORTED_MODULE_2__.getFallbackAnalysis)(extractedData, scores);\n            }\n        } else {\n            aiAnalysis = (0,_lib_score__WEBPACK_IMPORTED_MODULE_2__.getFallbackAnalysis)(extractedData, scores);\n        }\n        const report = {\n            url: normalizedUrl,\n            extractedData,\n            scores,\n            aiAnalysis,\n            pageSpeedScore,\n            analysisTimestamp: new Date().toISOString()\n        };\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(report, {\n            status: 200\n        });\n    } catch (err) {\n        console.error(\"Analyze route error:\", err);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"An unexpected error occurred. Please try again.\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2FuYWx5emUvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQXdEO0FBQ3VCO0FBQ1o7QUFDZjtBQUNQO0FBR3RDLGVBQWVTLEtBQUtDLEdBQWdCO0lBQ3pDLElBQUk7UUFDRixNQUFNQyxPQUFPLE1BQU1ELElBQUlFLElBQUk7UUFDM0IsTUFBTUMsU0FBU0YsTUFBTUc7UUFFckIsSUFBSSxDQUFDRCxVQUFVLE9BQU9BLFdBQVcsVUFBVTtZQUN6QyxPQUFPYixxREFBWUEsQ0FBQ1ksSUFBSSxDQUN0QjtnQkFBRUcsT0FBTztZQUE4QixHQUN2QztnQkFBRUMsUUFBUTtZQUFJO1FBRWxCO1FBRUEsTUFBTUMsZ0JBQWdCaEIseURBQVlBLENBQUNZO1FBRW5DLElBQUksQ0FBQ1gsd0RBQVdBLENBQUNlLGdCQUFnQjtZQUMvQixPQUFPakIscURBQVlBLENBQUNZLElBQUksQ0FDdEI7Z0JBQUVHLE9BQU87WUFBNkQsR0FDdEU7Z0JBQUVDLFFBQVE7WUFBSTtRQUVsQjtRQUVBLGFBQWE7UUFDYixJQUFJRTtRQUNKLElBQUk7WUFDRkEsT0FBTyxNQUFNZixzREFBU0EsQ0FBQ2M7UUFDekIsRUFBRSxPQUFPRSxLQUFjO1lBQ3JCLE1BQU1DLFVBQVVELGVBQWVFLFFBQVFGLElBQUlDLE9BQU8sR0FBRztZQUNyRCxJQUFJQSxRQUFRRSxRQUFRLENBQUMsWUFBWTtnQkFDL0IsT0FBT3RCLHFEQUFZQSxDQUFDWSxJQUFJLENBQ3RCO29CQUFFRyxPQUFPO2dCQUEyRCxHQUNwRTtvQkFBRUMsUUFBUTtnQkFBSTtZQUVsQjtZQUNBLE9BQU9oQixxREFBWUEsQ0FBQ1ksSUFBSSxDQUN0QjtnQkFDRUcsT0FBTztnQkFDUFEsU0FBU0g7WUFDWCxHQUNBO2dCQUFFSixRQUFRO1lBQUk7UUFFbEI7UUFFQSxhQUFhO1FBQ2IsTUFBTVEsZ0JBQWdCcEIsc0RBQVNBLENBQUNjLE1BQU1EO1FBRXRDLHVCQUF1QjtRQUN2QixNQUFNUSxpQkFBaUIsTUFBTWxCLGlFQUFpQkEsQ0FBQ1U7UUFFL0MsbUJBQW1CO1FBQ25CLE1BQU1TLFNBQVNyQiwyREFBZUEsQ0FBQ21CLGVBQWVDO1FBRTlDLHlCQUF5QjtRQUN6QixJQUFJRTtRQUNKLElBQUlDLFFBQVFDLEdBQUcsQ0FBQ0MsY0FBYyxJQUFJRixRQUFRQyxHQUFHLENBQUNFLGNBQWMsRUFBRTtZQUM1RCxJQUFJO2dCQUNGSixhQUFhLE1BQU1uQiwwREFBYUEsQ0FBQ2dCO1lBQ25DLEVBQUUsT0FBT0wsS0FBSztnQkFDWmEsUUFBUWpCLEtBQUssQ0FBQyxpQkFBaUJJO2dCQUMvQlEsYUFBYXJCLCtEQUFtQkEsQ0FBQ2tCLGVBQWVFO1lBQ2xEO1FBQ0YsT0FBTztZQUNMQyxhQUFhckIsK0RBQW1CQSxDQUFDa0IsZUFBZUU7UUFDbEQ7UUFFQSxNQUFNTyxTQUF5QjtZQUM3Qm5CLEtBQUtHO1lBQ0xPO1lBQ0FFO1lBQ0FDO1lBQ0FGO1lBQ0FTLG1CQUFtQixJQUFJQyxPQUFPQyxXQUFXO1FBQzNDO1FBRUEsT0FBT3BDLHFEQUFZQSxDQUFDWSxJQUFJLENBQUNxQixRQUFRO1lBQUVqQixRQUFRO1FBQUk7SUFDakQsRUFBRSxPQUFPRyxLQUFjO1FBQ3JCYSxRQUFRakIsS0FBSyxDQUFDLHdCQUF3Qkk7UUFDdEMsT0FBT25CLHFEQUFZQSxDQUFDWSxJQUFJLENBQ3RCO1lBQUVHLE9BQU87UUFBa0QsR0FDM0Q7WUFBRUMsUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIkQ6XFxBbnN3ZXJSYW5rIFNjYW5uZXJcXGFwcFxcYXBpXFxhbmFseXplXFxyb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XG5pbXBvcnQgeyBub3JtYWxpemVVcmwsIHZhbGlkYXRlVXJsLCBmZXRjaEh0bWwsIHBhcnNlSHRtbCB9IGZyb20gXCJAL2xpYi9zY3JhcGVcIjtcbmltcG9ydCB7IGNhbGN1bGF0ZVNjb3JlcywgZ2V0RmFsbGJhY2tBbmFseXNpcyB9IGZyb20gXCJAL2xpYi9zY29yZVwiO1xuaW1wb3J0IHsgZ2V0UGFnZVNwZWVkU2NvcmUgfSBmcm9tIFwiQC9saWIvcGFnZXNwZWVkXCI7XG5pbXBvcnQgeyBhbmFseXplV2l0aEFJIH0gZnJvbSBcIkAvbGliL29wZW5haVwiO1xuaW1wb3J0IHsgQW5hbHlzaXNSZXBvcnQgfSBmcm9tIFwiQC90eXBlcy9yZXBvcnRcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBOZXh0UmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXEuanNvbigpIGFzIHsgdXJsPzogc3RyaW5nIH07XG4gICAgY29uc3QgcmF3VXJsID0gYm9keT8udXJsO1xuXG4gICAgaWYgKCFyYXdVcmwgfHwgdHlwZW9mIHJhd1VybCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICB7IGVycm9yOiBcIlBsZWFzZSBwcm92aWRlIGEgdmFsaWQgVVJMLlwiIH0sXG4gICAgICAgIHsgc3RhdHVzOiA0MDAgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBub3JtYWxpemVkVXJsID0gbm9ybWFsaXplVXJsKHJhd1VybCk7XG5cbiAgICBpZiAoIXZhbGlkYXRlVXJsKG5vcm1hbGl6ZWRVcmwpKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6IFwiSW52YWxpZCBVUkwuIE9ubHkgaHR0cDovLyBhbmQgaHR0cHM6Ly8gVVJMcyBhcmUgc3VwcG9ydGVkLlwiIH0sXG4gICAgICAgIHsgc3RhdHVzOiA0MDAgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBIVE1MXG4gICAgbGV0IGh0bWw6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgaHRtbCA9IGF3YWl0IGZldGNoSHRtbChub3JtYWxpemVkVXJsKTtcbiAgICB9IGNhdGNoIChlcnI6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogXCJVbmtub3duIGVycm9yXCI7XG4gICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcyhcImFib3J0ZWRcIikpIHtcbiAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICAgIHsgZXJyb3I6IFwiUmVxdWVzdCB0aW1lZCBvdXQuIFRoZSB3ZWJzaXRlIHRvb2sgdG9vIGxvbmcgdG8gcmVzcG9uZC5cIiB9LFxuICAgICAgICAgIHsgc3RhdHVzOiA0MDggfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICB7XG4gICAgICAgICAgZXJyb3I6IFwiQ291bGQgbm90IGZldGNoIHRoZSB3ZWJzaXRlLiBJdCBtYXkgYmUgYmxvY2tpbmcgY3Jhd2xlcnMgb3IgdW5hdmFpbGFibGUuXCIsXG4gICAgICAgICAgZGV0YWlsczogbWVzc2FnZSxcbiAgICAgICAgfSxcbiAgICAgICAgeyBzdGF0dXM6IDQyMiB9XG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIEhUTUxcbiAgICBjb25zdCBleHRyYWN0ZWREYXRhID0gcGFyc2VIdG1sKGh0bWwsIG5vcm1hbGl6ZWRVcmwpO1xuXG4gICAgLy8gUGFnZVNwZWVkIChvcHRpb25hbClcbiAgICBjb25zdCBwYWdlU3BlZWRTY29yZSA9IGF3YWl0IGdldFBhZ2VTcGVlZFNjb3JlKG5vcm1hbGl6ZWRVcmwpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHNjb3Jlc1xuICAgIGNvbnN0IHNjb3JlcyA9IGNhbGN1bGF0ZVNjb3JlcyhleHRyYWN0ZWREYXRhLCBwYWdlU3BlZWRTY29yZSk7XG5cbiAgICAvLyBBSSBhbmFseXNpcyAob3B0aW9uYWwpXG4gICAgbGV0IGFpQW5hbHlzaXM7XG4gICAgaWYgKHByb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZIHx8IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhaUFuYWx5c2lzID0gYXdhaXQgYW5hbHl6ZVdpdGhBSShleHRyYWN0ZWREYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiT3BlbkFJIGVycm9yOlwiLCBlcnIpO1xuICAgICAgICBhaUFuYWx5c2lzID0gZ2V0RmFsbGJhY2tBbmFseXNpcyhleHRyYWN0ZWREYXRhLCBzY29yZXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhaUFuYWx5c2lzID0gZ2V0RmFsbGJhY2tBbmFseXNpcyhleHRyYWN0ZWREYXRhLCBzY29yZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcG9ydDogQW5hbHlzaXNSZXBvcnQgPSB7XG4gICAgICB1cmw6IG5vcm1hbGl6ZWRVcmwsXG4gICAgICBleHRyYWN0ZWREYXRhLFxuICAgICAgc2NvcmVzLFxuICAgICAgYWlBbmFseXNpcyxcbiAgICAgIHBhZ2VTcGVlZFNjb3JlLFxuICAgICAgYW5hbHlzaXNUaW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHJlcG9ydCwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgfSBjYXRjaCAoZXJyOiB1bmtub3duKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkFuYWx5emUgcm91dGUgZXJyb3I6XCIsIGVycik7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBlcnJvcjogXCJBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkLiBQbGVhc2UgdHJ5IGFnYWluLlwiIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApO1xuICB9XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwibm9ybWFsaXplVXJsIiwidmFsaWRhdGVVcmwiLCJmZXRjaEh0bWwiLCJwYXJzZUh0bWwiLCJjYWxjdWxhdGVTY29yZXMiLCJnZXRGYWxsYmFja0FuYWx5c2lzIiwiZ2V0UGFnZVNwZWVkU2NvcmUiLCJhbmFseXplV2l0aEFJIiwiUE9TVCIsInJlcSIsImJvZHkiLCJqc29uIiwicmF3VXJsIiwidXJsIiwiZXJyb3IiLCJzdGF0dXMiLCJub3JtYWxpemVkVXJsIiwiaHRtbCIsImVyciIsIm1lc3NhZ2UiLCJFcnJvciIsImluY2x1ZGVzIiwiZGV0YWlscyIsImV4dHJhY3RlZERhdGEiLCJwYWdlU3BlZWRTY29yZSIsInNjb3JlcyIsImFpQW5hbHlzaXMiLCJwcm9jZXNzIiwiZW52IiwiR0VNSU5JX0FQSV9LRVkiLCJPUEVOQUlfQVBJX0tFWSIsImNvbnNvbGUiLCJyZXBvcnQiLCJhbmFseXNpc1RpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/analyze/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/openai.ts":
/*!***********************!*\
  !*** ./lib/openai.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   analyzeWithAI: () => (/* binding */ analyzeWithAI)\n/* harmony export */ });\n/* harmony import */ var _google_genai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @google/genai */ \"(rsc)/./node_modules/@google/genai/dist/node/index.mjs\");\n/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! openai */ \"(rsc)/./node_modules/openai/index.mjs\");\n\n\nconst SYSTEM_PROMPT = `You are an expert SEO and AI search visibility analyst. \nYou analyze website data extracted from HTML and return a structured JSON report.\nRules:\n- Only infer from the provided page content. Do NOT invent facts.\n- If something is unclear from the page content, say \"unclear from page content\".\n- Be concise but specific. Avoid generic advice.\n- Return valid JSON only. No markdown, no code fences, no extra text.`;\nfunction buildUserMessage(data) {\n    return `Analyze this website data and return a JSON report:\n\nPAGE TITLE: ${data.pageTitle || \"None\"}\nMETA DESCRIPTION: ${data.metaDescription || \"None\"}\nH1 TAGS: ${data.h1Tags.join(\" | \") || \"None\"}\nH2 TAGS: ${data.h2Tags.slice(0, 10).join(\" | \") || \"None\"}\nOG TITLE: ${data.ogTitle || \"None\"}\nOG DESCRIPTION: ${data.ogDescription || \"None\"}\nCANONICAL URL: ${data.canonicalUrl || \"None\"}\nSCHEMA TYPES DETECTED: ${data.schemaTypes.join(\", \") || \"None\"}\nIMAGE COUNT: ${data.imageCount}\nIMAGES MISSING ALT: ${data.imagesMissingAlt}\nINTERNAL LINKS: ${data.internalLinks}\nEXTERNAL LINKS: ${data.externalLinks}\n\nBODY TEXT (first 4000 chars):\n${data.bodyText.slice(0, 4000)}\n\nReturn ONLY this JSON structure (no code fences):\n{\n  \"plainEnglishSummary\": \"2-3 sentence summary of what this page is and what it does\",\n  \"detectedBusinessType\": \"e.g. SaaS, E-commerce, Agency, Blog, etc.\",\n  \"targetAudience\": \"who this page is for, based only on content\",\n  \"detectedEntities\": [\"list of brands, products, people, or concepts mentioned\"],\n  \"missingEntities\": [\"important entities that are missing and would help AI engines\"],\n  \"aiSearchWeaknesses\": [\"specific weaknesses hurting AI search visibility\"],\n  \"highImpactFixes\": [\"top 5 specific, actionable fixes ordered by impact\"],\n  \"recommendedFaqs\": [\n    {\"question\": \"...\", \"answer\": \"...\"},\n    {\"question\": \"...\", \"answer\": \"...\"},\n    {\"question\": \"...\", \"answer\": \"...\"}\n  ],\n  \"schemaRecommendations\": [\"specific schema types and fields to add\"],\n  \"finalVerdict\": \"1-2 sentence overall verdict on AI visibility readiness\"\n}`;\n}\nasync function analyzeWithAI(data) {\n    const geminiKey = process.env.GEMINI_API_KEY;\n    const openaiKey = process.env.OPENAI_API_KEY;\n    if (!geminiKey && !openaiKey) {\n        throw new Error(\"No AI API keys set\");\n    }\n    const userMessage = buildUserMessage(data);\n    let raw = \"\";\n    if (geminiKey) {\n        const ai = new _google_genai__WEBPACK_IMPORTED_MODULE_0__.GoogleGenAI({\n            apiKey: geminiKey\n        });\n        const response = await ai.models.generateContent({\n            model: 'gemini-2.5-flash',\n            contents: [\n                {\n                    role: 'user',\n                    parts: [\n                        {\n                            text: SYSTEM_PROMPT + '\\n\\n' + userMessage\n                        }\n                    ]\n                }\n            ],\n            config: {\n                temperature: 0.3,\n                responseMimeType: \"application/json\"\n            }\n        });\n        raw = response.text || \"\";\n    } else if (openaiKey) {\n        const client = new openai__WEBPACK_IMPORTED_MODULE_1__[\"default\"]({\n            apiKey: openaiKey\n        });\n        const completion = await client.chat.completions.create({\n            model: \"gpt-4o-mini\",\n            messages: [\n                {\n                    role: \"system\",\n                    content: SYSTEM_PROMPT\n                },\n                {\n                    role: \"user\",\n                    content: userMessage\n                }\n            ],\n            temperature: 0.3,\n            max_tokens: 2000,\n            response_format: {\n                type: \"json_object\"\n            }\n        });\n        raw = completion.choices[0]?.message?.content?.trim() ?? \"\";\n    }\n    // Strip potential markdown fences\n    const cleaned = raw.replace(/^```json?\\n?/i, \"\").replace(/```$/i, \"\").trim();\n    const parsed = JSON.parse(cleaned);\n    return parsed;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvb3BlbmFpLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUE0QztBQUNoQjtBQUc1QixNQUFNRSxnQkFBZ0IsQ0FBQzs7Ozs7O3FFQU04QyxDQUFDO0FBRXRFLFNBQVNDLGlCQUFpQkMsSUFBbUI7SUFDM0MsT0FBTyxDQUFDOztZQUVFLEVBQUVBLEtBQUtDLFNBQVMsSUFBSSxPQUFPO2tCQUNyQixFQUFFRCxLQUFLRSxlQUFlLElBQUksT0FBTztTQUMxQyxFQUFFRixLQUFLRyxNQUFNLENBQUNDLElBQUksQ0FBQyxVQUFVLE9BQU87U0FDcEMsRUFBRUosS0FBS0ssTUFBTSxDQUFDQyxLQUFLLENBQUMsR0FBRyxJQUFJRixJQUFJLENBQUMsVUFBVSxPQUFPO1VBQ2hELEVBQUVKLEtBQUtPLE9BQU8sSUFBSSxPQUFPO2dCQUNuQixFQUFFUCxLQUFLUSxhQUFhLElBQUksT0FBTztlQUNoQyxFQUFFUixLQUFLUyxZQUFZLElBQUksT0FBTzt1QkFDdEIsRUFBRVQsS0FBS1UsV0FBVyxDQUFDTixJQUFJLENBQUMsU0FBUyxPQUFPO2FBQ2xELEVBQUVKLEtBQUtXLFVBQVUsQ0FBQztvQkFDWCxFQUFFWCxLQUFLWSxnQkFBZ0IsQ0FBQztnQkFDNUIsRUFBRVosS0FBS2EsYUFBYSxDQUFDO2dCQUNyQixFQUFFYixLQUFLYyxhQUFhLENBQUM7OztBQUdyQyxFQUFFZCxLQUFLZSxRQUFRLENBQUNULEtBQUssQ0FBQyxHQUFHLE1BQU07Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtCOUIsQ0FBQztBQUNGO0FBRU8sZUFBZVUsY0FDcEJoQixJQUFtQjtJQUVuQixNQUFNaUIsWUFBWUMsUUFBUUMsR0FBRyxDQUFDQyxjQUFjO0lBQzVDLE1BQU1DLFlBQVlILFFBQVFDLEdBQUcsQ0FBQ0csY0FBYztJQUU1QyxJQUFJLENBQUNMLGFBQWEsQ0FBQ0ksV0FBVztRQUM1QixNQUFNLElBQUlFLE1BQU07SUFDbEI7SUFFQSxNQUFNQyxjQUFjekIsaUJBQWlCQztJQUNyQyxJQUFJeUIsTUFBTTtJQUVWLElBQUlSLFdBQVc7UUFDYixNQUFNUyxLQUFLLElBQUk5QixzREFBV0EsQ0FBQztZQUFFK0IsUUFBUVY7UUFBVTtRQUMvQyxNQUFNVyxXQUFXLE1BQU1GLEdBQUdHLE1BQU0sQ0FBQ0MsZUFBZSxDQUFDO1lBQzdDQyxPQUFPO1lBQ1BDLFVBQVU7Z0JBQ047b0JBQUVDLE1BQU07b0JBQVFDLE9BQU87d0JBQUM7NEJBQUVDLE1BQU1yQyxnQkFBZ0IsU0FBUzBCO3dCQUFZO3FCQUFFO2dCQUFDO2FBQzNFO1lBQ0RZLFFBQVE7Z0JBQ0pDLGFBQWE7Z0JBQ2JDLGtCQUFrQjtZQUN0QjtRQUNKO1FBQ0FiLE1BQU1HLFNBQVNPLElBQUksSUFBSTtJQUN6QixPQUFPLElBQUlkLFdBQVc7UUFDcEIsTUFBTWtCLFNBQVMsSUFBSTFDLDhDQUFNQSxDQUFDO1lBQUU4QixRQUFRTjtRQUFVO1FBQzlDLE1BQU1tQixhQUFhLE1BQU1ELE9BQU9FLElBQUksQ0FBQ0MsV0FBVyxDQUFDQyxNQUFNLENBQUM7WUFDdERaLE9BQU87WUFDUGEsVUFBVTtnQkFDUjtvQkFBRVgsTUFBTTtvQkFBVVksU0FBUy9DO2dCQUFjO2dCQUN6QztvQkFBRW1DLE1BQU07b0JBQVFZLFNBQVNyQjtnQkFBWTthQUN0QztZQUNEYSxhQUFhO1lBQ2JTLFlBQVk7WUFDWkMsaUJBQWlCO2dCQUFFQyxNQUFNO1lBQWM7UUFDekM7UUFDQXZCLE1BQU1lLFdBQVdTLE9BQU8sQ0FBQyxFQUFFLEVBQUVDLFNBQVNMLFNBQVNNLFVBQVU7SUFDM0Q7SUFFQSxrQ0FBa0M7SUFDbEMsTUFBTUMsVUFBVTNCLElBQUk0QixPQUFPLENBQUMsaUJBQWlCLElBQUlBLE9BQU8sQ0FBQyxTQUFTLElBQUlGLElBQUk7SUFFMUUsTUFBTUcsU0FBU0MsS0FBS0MsS0FBSyxDQUFDSjtJQUMxQixPQUFPRTtBQUNUIiwic291cmNlcyI6WyJEOlxcQW5zd2VyUmFuayBTY2FubmVyXFxsaWJcXG9wZW5haS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBHb29nbGVHZW5BSSB9IGZyb20gXCJAZ29vZ2xlL2dlbmFpXCI7XG5pbXBvcnQgT3BlbkFJIGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IEV4dHJhY3RlZERhdGEsIEFJQW5hbHlzaXMgfSBmcm9tIFwiQC90eXBlcy9yZXBvcnRcIjtcblxuY29uc3QgU1lTVEVNX1BST01QVCA9IGBZb3UgYXJlIGFuIGV4cGVydCBTRU8gYW5kIEFJIHNlYXJjaCB2aXNpYmlsaXR5IGFuYWx5c3QuIFxuWW91IGFuYWx5emUgd2Vic2l0ZSBkYXRhIGV4dHJhY3RlZCBmcm9tIEhUTUwgYW5kIHJldHVybiBhIHN0cnVjdHVyZWQgSlNPTiByZXBvcnQuXG5SdWxlczpcbi0gT25seSBpbmZlciBmcm9tIHRoZSBwcm92aWRlZCBwYWdlIGNvbnRlbnQuIERvIE5PVCBpbnZlbnQgZmFjdHMuXG4tIElmIHNvbWV0aGluZyBpcyB1bmNsZWFyIGZyb20gdGhlIHBhZ2UgY29udGVudCwgc2F5IFwidW5jbGVhciBmcm9tIHBhZ2UgY29udGVudFwiLlxuLSBCZSBjb25jaXNlIGJ1dCBzcGVjaWZpYy4gQXZvaWQgZ2VuZXJpYyBhZHZpY2UuXG4tIFJldHVybiB2YWxpZCBKU09OIG9ubHkuIE5vIG1hcmtkb3duLCBubyBjb2RlIGZlbmNlcywgbm8gZXh0cmEgdGV4dC5gO1xuXG5mdW5jdGlvbiBidWlsZFVzZXJNZXNzYWdlKGRhdGE6IEV4dHJhY3RlZERhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYEFuYWx5emUgdGhpcyB3ZWJzaXRlIGRhdGEgYW5kIHJldHVybiBhIEpTT04gcmVwb3J0OlxuXG5QQUdFIFRJVExFOiAke2RhdGEucGFnZVRpdGxlIHx8IFwiTm9uZVwifVxuTUVUQSBERVNDUklQVElPTjogJHtkYXRhLm1ldGFEZXNjcmlwdGlvbiB8fCBcIk5vbmVcIn1cbkgxIFRBR1M6ICR7ZGF0YS5oMVRhZ3Muam9pbihcIiB8IFwiKSB8fCBcIk5vbmVcIn1cbkgyIFRBR1M6ICR7ZGF0YS5oMlRhZ3Muc2xpY2UoMCwgMTApLmpvaW4oXCIgfCBcIikgfHwgXCJOb25lXCJ9XG5PRyBUSVRMRTogJHtkYXRhLm9nVGl0bGUgfHwgXCJOb25lXCJ9XG5PRyBERVNDUklQVElPTjogJHtkYXRhLm9nRGVzY3JpcHRpb24gfHwgXCJOb25lXCJ9XG5DQU5PTklDQUwgVVJMOiAke2RhdGEuY2Fub25pY2FsVXJsIHx8IFwiTm9uZVwifVxuU0NIRU1BIFRZUEVTIERFVEVDVEVEOiAke2RhdGEuc2NoZW1hVHlwZXMuam9pbihcIiwgXCIpIHx8IFwiTm9uZVwifVxuSU1BR0UgQ09VTlQ6ICR7ZGF0YS5pbWFnZUNvdW50fVxuSU1BR0VTIE1JU1NJTkcgQUxUOiAke2RhdGEuaW1hZ2VzTWlzc2luZ0FsdH1cbklOVEVSTkFMIExJTktTOiAke2RhdGEuaW50ZXJuYWxMaW5rc31cbkVYVEVSTkFMIExJTktTOiAke2RhdGEuZXh0ZXJuYWxMaW5rc31cblxuQk9EWSBURVhUIChmaXJzdCA0MDAwIGNoYXJzKTpcbiR7ZGF0YS5ib2R5VGV4dC5zbGljZSgwLCA0MDAwKX1cblxuUmV0dXJuIE9OTFkgdGhpcyBKU09OIHN0cnVjdHVyZSAobm8gY29kZSBmZW5jZXMpOlxue1xuICBcInBsYWluRW5nbGlzaFN1bW1hcnlcIjogXCIyLTMgc2VudGVuY2Ugc3VtbWFyeSBvZiB3aGF0IHRoaXMgcGFnZSBpcyBhbmQgd2hhdCBpdCBkb2VzXCIsXG4gIFwiZGV0ZWN0ZWRCdXNpbmVzc1R5cGVcIjogXCJlLmcuIFNhYVMsIEUtY29tbWVyY2UsIEFnZW5jeSwgQmxvZywgZXRjLlwiLFxuICBcInRhcmdldEF1ZGllbmNlXCI6IFwid2hvIHRoaXMgcGFnZSBpcyBmb3IsIGJhc2VkIG9ubHkgb24gY29udGVudFwiLFxuICBcImRldGVjdGVkRW50aXRpZXNcIjogW1wibGlzdCBvZiBicmFuZHMsIHByb2R1Y3RzLCBwZW9wbGUsIG9yIGNvbmNlcHRzIG1lbnRpb25lZFwiXSxcbiAgXCJtaXNzaW5nRW50aXRpZXNcIjogW1wiaW1wb3J0YW50IGVudGl0aWVzIHRoYXQgYXJlIG1pc3NpbmcgYW5kIHdvdWxkIGhlbHAgQUkgZW5naW5lc1wiXSxcbiAgXCJhaVNlYXJjaFdlYWtuZXNzZXNcIjogW1wic3BlY2lmaWMgd2Vha25lc3NlcyBodXJ0aW5nIEFJIHNlYXJjaCB2aXNpYmlsaXR5XCJdLFxuICBcImhpZ2hJbXBhY3RGaXhlc1wiOiBbXCJ0b3AgNSBzcGVjaWZpYywgYWN0aW9uYWJsZSBmaXhlcyBvcmRlcmVkIGJ5IGltcGFjdFwiXSxcbiAgXCJyZWNvbW1lbmRlZEZhcXNcIjogW1xuICAgIHtcInF1ZXN0aW9uXCI6IFwiLi4uXCIsIFwiYW5zd2VyXCI6IFwiLi4uXCJ9LFxuICAgIHtcInF1ZXN0aW9uXCI6IFwiLi4uXCIsIFwiYW5zd2VyXCI6IFwiLi4uXCJ9LFxuICAgIHtcInF1ZXN0aW9uXCI6IFwiLi4uXCIsIFwiYW5zd2VyXCI6IFwiLi4uXCJ9XG4gIF0sXG4gIFwic2NoZW1hUmVjb21tZW5kYXRpb25zXCI6IFtcInNwZWNpZmljIHNjaGVtYSB0eXBlcyBhbmQgZmllbGRzIHRvIGFkZFwiXSxcbiAgXCJmaW5hbFZlcmRpY3RcIjogXCIxLTIgc2VudGVuY2Ugb3ZlcmFsbCB2ZXJkaWN0IG9uIEFJIHZpc2liaWxpdHkgcmVhZGluZXNzXCJcbn1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZVdpdGhBSShcbiAgZGF0YTogRXh0cmFjdGVkRGF0YVxuKTogUHJvbWlzZTxBSUFuYWx5c2lzPiB7XG4gIGNvbnN0IGdlbWluaUtleSA9IHByb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZO1xuICBjb25zdCBvcGVuYWlLZXkgPSBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWTtcblxuICBpZiAoIWdlbWluaUtleSAmJiAhb3BlbmFpS2V5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gQUkgQVBJIGtleXMgc2V0XCIpO1xuICB9XG5cbiAgY29uc3QgdXNlck1lc3NhZ2UgPSBidWlsZFVzZXJNZXNzYWdlKGRhdGEpO1xuICBsZXQgcmF3ID0gXCJcIjtcblxuICBpZiAoZ2VtaW5pS2V5KSB7XG4gICAgY29uc3QgYWkgPSBuZXcgR29vZ2xlR2VuQUkoeyBhcGlLZXk6IGdlbWluaUtleSB9KTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFpLm1vZGVscy5nZW5lcmF0ZUNvbnRlbnQoe1xuICAgICAgICBtb2RlbDogJ2dlbWluaS0yLjUtZmxhc2gnLFxuICAgICAgICBjb250ZW50czogW1xuICAgICAgICAgICAgeyByb2xlOiAndXNlcicsIHBhcnRzOiBbeyB0ZXh0OiBTWVNURU1fUFJPTVBUICsgJ1xcblxcbicgKyB1c2VyTWVzc2FnZSB9XSB9XG4gICAgICAgIF0sXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuMyxcbiAgICAgICAgICAgIHJlc3BvbnNlTWltZVR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmF3ID0gcmVzcG9uc2UudGV4dCB8fCBcIlwiO1xuICB9IGVsc2UgaWYgKG9wZW5haUtleSkge1xuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBPcGVuQUkoeyBhcGlLZXk6IG9wZW5haUtleSB9KTtcbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXdhaXQgY2xpZW50LmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgICBtZXNzYWdlczogW1xuICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IFNZU1RFTV9QUk9NUFQgfSxcbiAgICAgICAgeyByb2xlOiBcInVzZXJcIiwgY29udGVudDogdXNlck1lc3NhZ2UgfSxcbiAgICAgIF0sXG4gICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgbWF4X3Rva2VuczogMjAwMCxcbiAgICAgIHJlc3BvbnNlX2Zvcm1hdDogeyB0eXBlOiBcImpzb25fb2JqZWN0XCIgfVxuICAgIH0pO1xuICAgIHJhdyA9IGNvbXBsZXRpb24uY2hvaWNlc1swXT8ubWVzc2FnZT8uY29udGVudD8udHJpbSgpID8/IFwiXCI7XG4gIH1cblxuICAvLyBTdHJpcCBwb3RlbnRpYWwgbWFya2Rvd24gZmVuY2VzXG4gIGNvbnN0IGNsZWFuZWQgPSByYXcucmVwbGFjZSgvXmBgYGpzb24/XFxuPy9pLCBcIlwiKS5yZXBsYWNlKC9gYGAkL2ksIFwiXCIpLnRyaW0oKTtcblxuICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGNsZWFuZWQpIGFzIEFJQW5hbHlzaXM7XG4gIHJldHVybiBwYXJzZWQ7XG59XG4iXSwibmFtZXMiOlsiR29vZ2xlR2VuQUkiLCJPcGVuQUkiLCJTWVNURU1fUFJPTVBUIiwiYnVpbGRVc2VyTWVzc2FnZSIsImRhdGEiLCJwYWdlVGl0bGUiLCJtZXRhRGVzY3JpcHRpb24iLCJoMVRhZ3MiLCJqb2luIiwiaDJUYWdzIiwic2xpY2UiLCJvZ1RpdGxlIiwib2dEZXNjcmlwdGlvbiIsImNhbm9uaWNhbFVybCIsInNjaGVtYVR5cGVzIiwiaW1hZ2VDb3VudCIsImltYWdlc01pc3NpbmdBbHQiLCJpbnRlcm5hbExpbmtzIiwiZXh0ZXJuYWxMaW5rcyIsImJvZHlUZXh0IiwiYW5hbHl6ZVdpdGhBSSIsImdlbWluaUtleSIsInByb2Nlc3MiLCJlbnYiLCJHRU1JTklfQVBJX0tFWSIsIm9wZW5haUtleSIsIk9QRU5BSV9BUElfS0VZIiwiRXJyb3IiLCJ1c2VyTWVzc2FnZSIsInJhdyIsImFpIiwiYXBpS2V5IiwicmVzcG9uc2UiLCJtb2RlbHMiLCJnZW5lcmF0ZUNvbnRlbnQiLCJtb2RlbCIsImNvbnRlbnRzIiwicm9sZSIsInBhcnRzIiwidGV4dCIsImNvbmZpZyIsInRlbXBlcmF0dXJlIiwicmVzcG9uc2VNaW1lVHlwZSIsImNsaWVudCIsImNvbXBsZXRpb24iLCJjaGF0IiwiY29tcGxldGlvbnMiLCJjcmVhdGUiLCJtZXNzYWdlcyIsImNvbnRlbnQiLCJtYXhfdG9rZW5zIiwicmVzcG9uc2VfZm9ybWF0IiwidHlwZSIsImNob2ljZXMiLCJtZXNzYWdlIiwidHJpbSIsImNsZWFuZWQiLCJyZXBsYWNlIiwicGFyc2VkIiwiSlNPTiIsInBhcnNlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/openai.ts\n");

/***/ }),

/***/ "(rsc)/./lib/pagespeed.ts":
/*!**************************!*\
  !*** ./lib/pagespeed.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getPageSpeedScore: () => (/* binding */ getPageSpeedScore)\n/* harmony export */ });\nasync function getPageSpeedScore(url) {\n    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;\n    if (!apiKey) return null;\n    try {\n        const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;\n        const controller = new AbortController();\n        const timeout = setTimeout(()=>controller.abort(), 15000);\n        const res = await fetch(endpoint, {\n            signal: controller.signal\n        });\n        clearTimeout(timeout);\n        if (!res.ok) return null;\n        const data = await res.json();\n        const score = data?.lighthouseResult?.categories?.performance?.score;\n        if (typeof score === \"number\") {\n            return Math.round(score * 100);\n        }\n        return null;\n    } catch  {\n        return null;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcGFnZXNwZWVkLnRzIiwibWFwcGluZ3MiOiI7Ozs7QUFBTyxlQUFlQSxrQkFBa0JDLEdBQVc7SUFDakQsTUFBTUMsU0FBU0MsUUFBUUMsR0FBRyxDQUFDQyx3QkFBd0I7SUFDbkQsSUFBSSxDQUFDSCxRQUFRLE9BQU87SUFFcEIsSUFBSTtRQUNGLE1BQU1JLFdBQVcsQ0FBQywrREFBK0QsRUFBRUMsbUJBQW1CTixLQUFLLEtBQUssRUFBRUMsT0FBTyxxQ0FBcUMsQ0FBQztRQUUvSixNQUFNTSxhQUFhLElBQUlDO1FBQ3ZCLE1BQU1DLFVBQVVDLFdBQVcsSUFBTUgsV0FBV0ksS0FBSyxJQUFJO1FBRXJELE1BQU1DLE1BQU0sTUFBTUMsTUFBTVIsVUFBVTtZQUFFUyxRQUFRUCxXQUFXTyxNQUFNO1FBQUM7UUFDOURDLGFBQWFOO1FBRWIsSUFBSSxDQUFDRyxJQUFJSSxFQUFFLEVBQUUsT0FBTztRQUVwQixNQUFNQyxPQUFPLE1BQU1MLElBQUlNLElBQUk7UUFPM0IsTUFBTUMsUUFBUUYsTUFBTUcsa0JBQWtCQyxZQUFZQyxhQUFhSDtRQUMvRCxJQUFJLE9BQU9BLFVBQVUsVUFBVTtZQUM3QixPQUFPSSxLQUFLQyxLQUFLLENBQUNMLFFBQVE7UUFDNUI7UUFDQSxPQUFPO0lBQ1QsRUFBRSxPQUFNO1FBQ04sT0FBTztJQUNUO0FBQ0YiLCJzb3VyY2VzIjpbIkQ6XFxBbnN3ZXJSYW5rIFNjYW5uZXJcXGxpYlxccGFnZXNwZWVkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQYWdlU3BlZWRTY29yZSh1cmw6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICBjb25zdCBhcGlLZXkgPSBwcm9jZXNzLmVudi5HT09HTEVfUEFHRVNQRUVEX0FQSV9LRVk7XG4gIGlmICghYXBpS2V5KSByZXR1cm4gbnVsbDtcblxuICB0cnkge1xuICAgIGNvbnN0IGVuZHBvaW50ID0gYGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3BhZ2VzcGVlZG9ubGluZS92NS9ydW5QYWdlc3BlZWQ/dXJsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHVybCl9JmtleT0ke2FwaUtleX0mc3RyYXRlZ3k9bW9iaWxlJmNhdGVnb3J5PXBlcmZvcm1hbmNlYDtcblxuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCAxNTAwMCk7XG5cbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChlbmRwb2ludCwgeyBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsIH0pO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblxuICAgIGlmICghcmVzLm9rKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpIGFzIHtcbiAgICAgIGxpZ2h0aG91c2VSZXN1bHQ/OiB7XG4gICAgICAgIGNhdGVnb3JpZXM/OiB7XG4gICAgICAgICAgcGVyZm9ybWFuY2U/OiB7IHNjb3JlPzogbnVtYmVyIH07XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH07XG4gICAgY29uc3Qgc2NvcmUgPSBkYXRhPy5saWdodGhvdXNlUmVzdWx0Py5jYXRlZ29yaWVzPy5wZXJmb3JtYW5jZT8uc2NvcmU7XG4gICAgaWYgKHR5cGVvZiBzY29yZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoc2NvcmUgKiAxMDApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJnZXRQYWdlU3BlZWRTY29yZSIsInVybCIsImFwaUtleSIsInByb2Nlc3MiLCJlbnYiLCJHT09HTEVfUEFHRVNQRUVEX0FQSV9LRVkiLCJlbmRwb2ludCIsImVuY29kZVVSSUNvbXBvbmVudCIsImNvbnRyb2xsZXIiLCJBYm9ydENvbnRyb2xsZXIiLCJ0aW1lb3V0Iiwic2V0VGltZW91dCIsImFib3J0IiwicmVzIiwiZmV0Y2giLCJzaWduYWwiLCJjbGVhclRpbWVvdXQiLCJvayIsImRhdGEiLCJqc29uIiwic2NvcmUiLCJsaWdodGhvdXNlUmVzdWx0IiwiY2F0ZWdvcmllcyIsInBlcmZvcm1hbmNlIiwiTWF0aCIsInJvdW5kIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/pagespeed.ts\n");

/***/ }),

/***/ "(rsc)/./lib/score.ts":
/*!**********************!*\
  !*** ./lib/score.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   calculateScores: () => (/* binding */ calculateScores),\n/* harmony export */   getFallbackAnalysis: () => (/* binding */ getFallbackAnalysis),\n/* harmony export */   scoreLabelAndColor: () => (/* binding */ scoreLabelAndColor)\n/* harmony export */ });\nconst USEFUL_SCHEMA_TYPES = [\n    \"Organization\",\n    \"Product\",\n    \"Service\",\n    \"Article\",\n    \"FAQPage\",\n    \"BreadcrumbList\",\n    \"WebSite\",\n    \"LocalBusiness\",\n    \"Person\",\n    \"HowTo\",\n    \"Review\"\n];\nconst FAQ_KEYWORDS = [\n    \"faq\",\n    \"frequently asked\",\n    \"question\",\n    \"answer\",\n    \"how do\",\n    \"what is\",\n    \"why should\",\n    \"can i\",\n    \"do you\"\n];\nconst AUDIENCE_KEYWORDS = [\n    \"for\",\n    \"teams\",\n    \"businesses\",\n    \"companies\",\n    \"developers\",\n    \"marketers\",\n    \"agencies\",\n    \"startups\",\n    \"enterprise\",\n    \"professionals\",\n    \"you can\",\n    \"your\"\n];\nfunction calculateScores(data, pageSpeedScore) {\n    // 1. Metadata (15 pts)\n    let metadata = 0;\n    if (data.pageTitle && data.pageTitle.length >= 10 && data.pageTitle.length <= 70) metadata += 5;\n    else if (data.pageTitle) metadata += 2;\n    if (data.metaDescription && data.metaDescription.length >= 50 && data.metaDescription.length <= 160) metadata += 6;\n    else if (data.metaDescription) metadata += 3;\n    if (data.canonicalUrl) metadata += 4;\n    // 2. Headings (15 pts)\n    let headings = 0;\n    if (data.h1Tags.length === 1) headings += 9;\n    else if (data.h1Tags.length > 1) headings += 4; // multiple H1s is bad\n    if (data.h2Tags.length >= 2) headings += 6;\n    else if (data.h2Tags.length === 1) headings += 3;\n    // 3. Schema (20 pts)\n    let schema = 0;\n    if (data.jsonLdBlocks.length > 0) schema += 8;\n    const usefulFound = data.schemaTypes.filter((t)=>USEFUL_SCHEMA_TYPES.includes(t));\n    if (usefulFound.length >= 3) schema += 12;\n    else if (usefulFound.length === 2) schema += 9;\n    else if (usefulFound.length === 1) schema += 5;\n    // 4. Content clarity (20 pts)\n    let contentClarity = 0;\n    const bodyLower = data.bodyText.toLowerCase();\n    if (data.bodyText.length > 500) contentClarity += 8;\n    else if (data.bodyText.length > 200) contentClarity += 4;\n    const hasAudience = AUDIENCE_KEYWORDS.some((kw)=>bodyLower.includes(kw));\n    if (hasAudience) contentClarity += 6;\n    const hasProductDesc = data.ogDescription.length > 20 || data.metaDescription.length > 20;\n    if (hasProductDesc) contentClarity += 6;\n    // 5. AI Answer Readiness (15 pts)\n    let aiReadiness = 0;\n    const hasFaq = FAQ_KEYWORDS.some((kw)=>bodyLower.includes(kw));\n    if (hasFaq) aiReadiness += 5;\n    const hasFaqSchema = data.schemaTypes.includes(\"FAQPage\");\n    if (hasFaqSchema) aiReadiness += 5;\n    const hasEntitySignals = data.schemaTypes.includes(\"Organization\") || data.schemaTypes.includes(\"Product\") || data.schemaTypes.includes(\"Service\");\n    if (hasEntitySignals) aiReadiness += 5;\n    // 6. Performance (15 pts)\n    let performance = 0;\n    if (pageSpeedScore !== null) {\n        if (pageSpeedScore >= 90) performance = 15;\n        else if (pageSpeedScore >= 75) performance = 12;\n        else if (pageSpeedScore >= 50) performance = 8;\n        else performance = 4;\n    } else {\n        // Fallback: estimate based on content signals\n        if (data.imagesMissingAlt === 0 && data.imageCount > 0) performance += 4;\n        if (data.bodyText.length > 300) performance += 4;\n        if (data.canonicalUrl) performance += 3;\n        if (data.schemaTypes.length > 0) performance += 4;\n    }\n    const total = Math.min(100, metadata + headings + schema + contentClarity + aiReadiness + performance);\n    return {\n        metadata: Math.min(15, metadata),\n        headings: Math.min(15, headings),\n        schema: Math.min(20, schema),\n        contentClarity: Math.min(20, contentClarity),\n        aiAnswerReadiness: Math.min(15, aiReadiness),\n        performance: Math.min(15, performance),\n        total\n    };\n}\nfunction scoreLabelAndColor(total) {\n    if (total >= 85) return {\n        label: \"Excellent\",\n        color: \"#22c55e\",\n        gradient: \"from-emerald-400 to-green-500\"\n    };\n    if (total >= 70) return {\n        label: \"Strong\",\n        color: \"#3b82f6\",\n        gradient: \"from-blue-400 to-indigo-500\"\n    };\n    if (total >= 50) return {\n        label: \"Needs Work\",\n        color: \"#f59e0b\",\n        gradient: \"from-amber-400 to-orange-500\"\n    };\n    return {\n        label: \"Poor\",\n        color: \"#ef4444\",\n        gradient: \"from-red-400 to-rose-600\"\n    };\n}\nfunction getFallbackAnalysis(data, scores) {\n    const weaknesses = [];\n    const fixes = [];\n    const schemaRecs = [];\n    if (scores.metadata < 10) {\n        weaknesses.push(\"Meta title or description is missing or poorly optimized.\");\n        fixes.push(\"Add a descriptive meta title (50–70 chars) and meta description (120–155 chars).\");\n    }\n    if (scores.schema < 10) {\n        weaknesses.push(\"No JSON-LD structured data detected.\");\n        fixes.push(\"Add Organization and WebSite JSON-LD schema to help AI engines understand your brand.\");\n        schemaRecs.push(\"Add `Organization` schema with name, url, logo, and description fields.\");\n        schemaRecs.push(\"Add `WebSite` schema with SearchAction to enable sitelinks search box.\");\n    }\n    if (scores.aiAnswerReadiness < 8) {\n        weaknesses.push(\"No FAQ content or FAQ schema found.\");\n        fixes.push(\"Create an FAQ section and mark it up with FAQPage JSON-LD schema.\");\n        schemaRecs.push(\"Add `FAQPage` schema with at least 5 questions your customers ask.\");\n    }\n    if (data.h1Tags.length === 0) {\n        weaknesses.push(\"No H1 tag detected on the page.\");\n        fixes.push(\"Add a clear, keyword-rich H1 heading that describes what your page is about.\");\n    }\n    if (data.imagesMissingAlt > 0) {\n        weaknesses.push(`${data.imagesMissingAlt} image(s) are missing alt text.`);\n        fixes.push(\"Add descriptive alt text to all images to improve accessibility and AI indexing.\");\n    }\n    if (!data.canonicalUrl) {\n        weaknesses.push(\"No canonical URL tag found.\");\n        fixes.push(\"Add a canonical <link> tag to prevent duplicate content issues.\");\n    }\n    return {\n        plainEnglishSummary: \"This page was analyzed using deterministic checks. Add an OpenAI API key for a full AI-powered analysis.\",\n        detectedBusinessType: \"Unknown — add OpenAI key for AI detection\",\n        targetAudience: \"Unknown — add OpenAI key for AI detection\",\n        detectedEntities: data.schemaTypes.length > 0 ? data.schemaTypes : [\n            \"None detected\"\n        ],\n        missingEntities: [\n            \"OpenAI key required for entity analysis\"\n        ],\n        aiSearchWeaknesses: weaknesses.length > 0 ? weaknesses : [\n            \"No critical weaknesses detected.\"\n        ],\n        highImpactFixes: fixes.length > 0 ? fixes : [\n            \"Your page looks reasonably well-optimized.\"\n        ],\n        recommendedFaqs: [\n            {\n                question: \"What does your product/service do?\",\n                answer: \"Add a clear one-sentence answer here based on your offering.\"\n            },\n            {\n                question: \"Who is this for?\",\n                answer: \"Describe your ideal customer or user persona.\"\n            }\n        ],\n        schemaRecommendations: schemaRecs.length > 0 ? schemaRecs : [\n            \"Your schema setup looks reasonable. Consider adding FAQPage schema.\"\n        ],\n        finalVerdict: `Your site scored ${scores.total}/100. ${scores.total >= 70 ? \"Good foundation — focus on schema and FAQ content to boost AI visibility.\" : \"Significant gaps in schema, metadata, or content clarity are limiting AI discoverability.\"}`\n    };\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc2NvcmUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBRUEsTUFBTUEsc0JBQXNCO0lBQzFCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7Q0FDRDtBQUVELE1BQU1DLGVBQWU7SUFDbkI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFRCxNQUFNQyxvQkFBb0I7SUFDeEI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFTSxTQUFTQyxnQkFDZEMsSUFBbUIsRUFDbkJDLGNBQTZCO0lBRTdCLHVCQUF1QjtJQUN2QixJQUFJQyxXQUFXO0lBQ2YsSUFBSUYsS0FBS0csU0FBUyxJQUFJSCxLQUFLRyxTQUFTLENBQUNDLE1BQU0sSUFBSSxNQUFNSixLQUFLRyxTQUFTLENBQUNDLE1BQU0sSUFBSSxJQUFJRixZQUFZO1NBQ3pGLElBQUlGLEtBQUtHLFNBQVMsRUFBRUQsWUFBWTtJQUVyQyxJQUFJRixLQUFLSyxlQUFlLElBQUlMLEtBQUtLLGVBQWUsQ0FBQ0QsTUFBTSxJQUFJLE1BQU1KLEtBQUtLLGVBQWUsQ0FBQ0QsTUFBTSxJQUFJLEtBQUtGLFlBQVk7U0FDNUcsSUFBSUYsS0FBS0ssZUFBZSxFQUFFSCxZQUFZO0lBRTNDLElBQUlGLEtBQUtNLFlBQVksRUFBRUosWUFBWTtJQUVuQyx1QkFBdUI7SUFDdkIsSUFBSUssV0FBVztJQUNmLElBQUlQLEtBQUtRLE1BQU0sQ0FBQ0osTUFBTSxLQUFLLEdBQUdHLFlBQVk7U0FDckMsSUFBSVAsS0FBS1EsTUFBTSxDQUFDSixNQUFNLEdBQUcsR0FBR0csWUFBWSxHQUFHLHNCQUFzQjtJQUN0RSxJQUFJUCxLQUFLUyxNQUFNLENBQUNMLE1BQU0sSUFBSSxHQUFHRyxZQUFZO1NBQ3BDLElBQUlQLEtBQUtTLE1BQU0sQ0FBQ0wsTUFBTSxLQUFLLEdBQUdHLFlBQVk7SUFFL0MscUJBQXFCO0lBQ3JCLElBQUlHLFNBQVM7SUFDYixJQUFJVixLQUFLVyxZQUFZLENBQUNQLE1BQU0sR0FBRyxHQUFHTSxVQUFVO0lBQzVDLE1BQU1FLGNBQWNaLEtBQUthLFdBQVcsQ0FBQ0MsTUFBTSxDQUFDLENBQUNDLElBQzNDbkIsb0JBQW9Cb0IsUUFBUSxDQUFDRDtJQUUvQixJQUFJSCxZQUFZUixNQUFNLElBQUksR0FBR00sVUFBVTtTQUNsQyxJQUFJRSxZQUFZUixNQUFNLEtBQUssR0FBR00sVUFBVTtTQUN4QyxJQUFJRSxZQUFZUixNQUFNLEtBQUssR0FBR00sVUFBVTtJQUU3Qyw4QkFBOEI7SUFDOUIsSUFBSU8saUJBQWlCO0lBQ3JCLE1BQU1DLFlBQVlsQixLQUFLbUIsUUFBUSxDQUFDQyxXQUFXO0lBQzNDLElBQUlwQixLQUFLbUIsUUFBUSxDQUFDZixNQUFNLEdBQUcsS0FBS2Esa0JBQWtCO1NBQzdDLElBQUlqQixLQUFLbUIsUUFBUSxDQUFDZixNQUFNLEdBQUcsS0FBS2Esa0JBQWtCO0lBRXZELE1BQU1JLGNBQWN2QixrQkFBa0J3QixJQUFJLENBQUMsQ0FBQ0MsS0FBT0wsVUFBVUYsUUFBUSxDQUFDTztJQUN0RSxJQUFJRixhQUFhSixrQkFBa0I7SUFFbkMsTUFBTU8saUJBQ0p4QixLQUFLeUIsYUFBYSxDQUFDckIsTUFBTSxHQUFHLE1BQU1KLEtBQUtLLGVBQWUsQ0FBQ0QsTUFBTSxHQUFHO0lBQ2xFLElBQUlvQixnQkFBZ0JQLGtCQUFrQjtJQUV0QyxrQ0FBa0M7SUFDbEMsSUFBSVMsY0FBYztJQUNsQixNQUFNQyxTQUFTOUIsYUFBYXlCLElBQUksQ0FBQyxDQUFDQyxLQUFPTCxVQUFVRixRQUFRLENBQUNPO0lBQzVELElBQUlJLFFBQVFELGVBQWU7SUFFM0IsTUFBTUUsZUFBZTVCLEtBQUthLFdBQVcsQ0FBQ0csUUFBUSxDQUFDO0lBQy9DLElBQUlZLGNBQWNGLGVBQWU7SUFFakMsTUFBTUcsbUJBQ0o3QixLQUFLYSxXQUFXLENBQUNHLFFBQVEsQ0FBQyxtQkFDMUJoQixLQUFLYSxXQUFXLENBQUNHLFFBQVEsQ0FBQyxjQUMxQmhCLEtBQUthLFdBQVcsQ0FBQ0csUUFBUSxDQUFDO0lBQzVCLElBQUlhLGtCQUFrQkgsZUFBZTtJQUVyQywwQkFBMEI7SUFDMUIsSUFBSUksY0FBYztJQUNsQixJQUFJN0IsbUJBQW1CLE1BQU07UUFDM0IsSUFBSUEsa0JBQWtCLElBQUk2QixjQUFjO2FBQ25DLElBQUk3QixrQkFBa0IsSUFBSTZCLGNBQWM7YUFDeEMsSUFBSTdCLGtCQUFrQixJQUFJNkIsY0FBYzthQUN4Q0EsY0FBYztJQUNyQixPQUFPO1FBQ0wsOENBQThDO1FBQzlDLElBQUk5QixLQUFLK0IsZ0JBQWdCLEtBQUssS0FBSy9CLEtBQUtnQyxVQUFVLEdBQUcsR0FBR0YsZUFBZTtRQUN2RSxJQUFJOUIsS0FBS21CLFFBQVEsQ0FBQ2YsTUFBTSxHQUFHLEtBQUswQixlQUFlO1FBQy9DLElBQUk5QixLQUFLTSxZQUFZLEVBQUV3QixlQUFlO1FBQ3RDLElBQUk5QixLQUFLYSxXQUFXLENBQUNULE1BQU0sR0FBRyxHQUFHMEIsZUFBZTtJQUNsRDtJQUVBLE1BQU1HLFFBQVFDLEtBQUtDLEdBQUcsQ0FDcEIsS0FDQWpDLFdBQVdLLFdBQVdHLFNBQVNPLGlCQUFpQlMsY0FBY0k7SUFHaEUsT0FBTztRQUNMNUIsVUFBVWdDLEtBQUtDLEdBQUcsQ0FBQyxJQUFJakM7UUFDdkJLLFVBQVUyQixLQUFLQyxHQUFHLENBQUMsSUFBSTVCO1FBQ3ZCRyxRQUFRd0IsS0FBS0MsR0FBRyxDQUFDLElBQUl6QjtRQUNyQk8sZ0JBQWdCaUIsS0FBS0MsR0FBRyxDQUFDLElBQUlsQjtRQUM3Qm1CLG1CQUFtQkYsS0FBS0MsR0FBRyxDQUFDLElBQUlUO1FBQ2hDSSxhQUFhSSxLQUFLQyxHQUFHLENBQUMsSUFBSUw7UUFDMUJHO0lBQ0Y7QUFDRjtBQUVPLFNBQVNJLG1CQUFtQkosS0FBYTtJQUs5QyxJQUFJQSxTQUFTLElBQ1gsT0FBTztRQUNMSyxPQUFPO1FBQ1BDLE9BQU87UUFDUEMsVUFBVTtJQUNaO0lBQ0YsSUFBSVAsU0FBUyxJQUNYLE9BQU87UUFDTEssT0FBTztRQUNQQyxPQUFPO1FBQ1BDLFVBQVU7SUFDWjtJQUNGLElBQUlQLFNBQVMsSUFDWCxPQUFPO1FBQ0xLLE9BQU87UUFDUEMsT0FBTztRQUNQQyxVQUFVO0lBQ1o7SUFDRixPQUFPO1FBQ0xGLE9BQU87UUFDUEMsT0FBTztRQUNQQyxVQUFVO0lBQ1o7QUFDRjtBQUVPLFNBQVNDLG9CQUFvQnpDLElBQW1CLEVBQUUwQyxNQUFzQjtJQUM3RSxNQUFNQyxhQUF1QixFQUFFO0lBQy9CLE1BQU1DLFFBQWtCLEVBQUU7SUFDMUIsTUFBTUMsYUFBdUIsRUFBRTtJQUUvQixJQUFJSCxPQUFPeEMsUUFBUSxHQUFHLElBQUk7UUFDeEJ5QyxXQUFXRyxJQUFJLENBQUM7UUFDaEJGLE1BQU1FLElBQUksQ0FBQztJQUNiO0lBQ0EsSUFBSUosT0FBT2hDLE1BQU0sR0FBRyxJQUFJO1FBQ3RCaUMsV0FBV0csSUFBSSxDQUFDO1FBQ2hCRixNQUFNRSxJQUFJLENBQUM7UUFDWEQsV0FBV0MsSUFBSSxDQUFDO1FBQ2hCRCxXQUFXQyxJQUFJLENBQUM7SUFDbEI7SUFDQSxJQUFJSixPQUFPTixpQkFBaUIsR0FBRyxHQUFHO1FBQ2hDTyxXQUFXRyxJQUFJLENBQUM7UUFDaEJGLE1BQU1FLElBQUksQ0FBQztRQUNYRCxXQUFXQyxJQUFJLENBQUM7SUFDbEI7SUFDQSxJQUFJOUMsS0FBS1EsTUFBTSxDQUFDSixNQUFNLEtBQUssR0FBRztRQUM1QnVDLFdBQVdHLElBQUksQ0FBQztRQUNoQkYsTUFBTUUsSUFBSSxDQUFDO0lBQ2I7SUFDQSxJQUFJOUMsS0FBSytCLGdCQUFnQixHQUFHLEdBQUc7UUFDN0JZLFdBQVdHLElBQUksQ0FBQyxHQUFHOUMsS0FBSytCLGdCQUFnQixDQUFDLCtCQUErQixDQUFDO1FBQ3pFYSxNQUFNRSxJQUFJLENBQUM7SUFDYjtJQUNBLElBQUksQ0FBQzlDLEtBQUtNLFlBQVksRUFBRTtRQUN0QnFDLFdBQVdHLElBQUksQ0FBQztRQUNoQkYsTUFBTUUsSUFBSSxDQUFDO0lBQ2I7SUFFQSxPQUFPO1FBQ0xDLHFCQUNFO1FBQ0ZDLHNCQUFzQjtRQUN0QkMsZ0JBQWdCO1FBQ2hCQyxrQkFBa0JsRCxLQUFLYSxXQUFXLENBQUNULE1BQU0sR0FBRyxJQUFJSixLQUFLYSxXQUFXLEdBQUc7WUFBQztTQUFnQjtRQUNwRnNDLGlCQUFpQjtZQUFDO1NBQTBDO1FBQzVEQyxvQkFBb0JULFdBQVd2QyxNQUFNLEdBQUcsSUFBSXVDLGFBQWE7WUFBQztTQUFtQztRQUM3RlUsaUJBQWlCVCxNQUFNeEMsTUFBTSxHQUFHLElBQUl3QyxRQUFRO1lBQUM7U0FBNkM7UUFDMUZVLGlCQUFpQjtZQUNmO2dCQUNFQyxVQUFVO2dCQUNWQyxRQUFRO1lBQ1Y7WUFDQTtnQkFDRUQsVUFBVTtnQkFDVkMsUUFBUTtZQUNWO1NBQ0Q7UUFDREMsdUJBQ0VaLFdBQVd6QyxNQUFNLEdBQUcsSUFDaEJ5QyxhQUNBO1lBQUM7U0FBc0U7UUFDN0VhLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRWhCLE9BQU9ULEtBQUssQ0FBQyxNQUFNLEVBQUVTLE9BQU9ULEtBQUssSUFBSSxLQUFLLDhFQUE4RSw2RkFBNkY7SUFDelA7QUFDRiIsInNvdXJjZXMiOlsiRDpcXEFuc3dlclJhbmsgU2Nhbm5lclxcbGliXFxzY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFeHRyYWN0ZWREYXRhLCBTY29yZUJyZWFrZG93biB9IGZyb20gXCJAL3R5cGVzL3JlcG9ydFwiO1xuXG5jb25zdCBVU0VGVUxfU0NIRU1BX1RZUEVTID0gW1xuICBcIk9yZ2FuaXphdGlvblwiLFxuICBcIlByb2R1Y3RcIixcbiAgXCJTZXJ2aWNlXCIsXG4gIFwiQXJ0aWNsZVwiLFxuICBcIkZBUVBhZ2VcIixcbiAgXCJCcmVhZGNydW1iTGlzdFwiLFxuICBcIldlYlNpdGVcIixcbiAgXCJMb2NhbEJ1c2luZXNzXCIsXG4gIFwiUGVyc29uXCIsXG4gIFwiSG93VG9cIixcbiAgXCJSZXZpZXdcIixcbl07XG5cbmNvbnN0IEZBUV9LRVlXT1JEUyA9IFtcbiAgXCJmYXFcIixcbiAgXCJmcmVxdWVudGx5IGFza2VkXCIsXG4gIFwicXVlc3Rpb25cIixcbiAgXCJhbnN3ZXJcIixcbiAgXCJob3cgZG9cIixcbiAgXCJ3aGF0IGlzXCIsXG4gIFwid2h5IHNob3VsZFwiLFxuICBcImNhbiBpXCIsXG4gIFwiZG8geW91XCIsXG5dO1xuXG5jb25zdCBBVURJRU5DRV9LRVlXT1JEUyA9IFtcbiAgXCJmb3JcIixcbiAgXCJ0ZWFtc1wiLFxuICBcImJ1c2luZXNzZXNcIixcbiAgXCJjb21wYW5pZXNcIixcbiAgXCJkZXZlbG9wZXJzXCIsXG4gIFwibWFya2V0ZXJzXCIsXG4gIFwiYWdlbmNpZXNcIixcbiAgXCJzdGFydHVwc1wiLFxuICBcImVudGVycHJpc2VcIixcbiAgXCJwcm9mZXNzaW9uYWxzXCIsXG4gIFwieW91IGNhblwiLFxuICBcInlvdXJcIixcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVTY29yZXMoXG4gIGRhdGE6IEV4dHJhY3RlZERhdGEsXG4gIHBhZ2VTcGVlZFNjb3JlOiBudW1iZXIgfCBudWxsXG4pOiBTY29yZUJyZWFrZG93biB7XG4gIC8vIDEuIE1ldGFkYXRhICgxNSBwdHMpXG4gIGxldCBtZXRhZGF0YSA9IDA7XG4gIGlmIChkYXRhLnBhZ2VUaXRsZSAmJiBkYXRhLnBhZ2VUaXRsZS5sZW5ndGggPj0gMTAgJiYgZGF0YS5wYWdlVGl0bGUubGVuZ3RoIDw9IDcwKSBtZXRhZGF0YSArPSA1O1xuICBlbHNlIGlmIChkYXRhLnBhZ2VUaXRsZSkgbWV0YWRhdGEgKz0gMjtcblxuICBpZiAoZGF0YS5tZXRhRGVzY3JpcHRpb24gJiYgZGF0YS5tZXRhRGVzY3JpcHRpb24ubGVuZ3RoID49IDUwICYmIGRhdGEubWV0YURlc2NyaXB0aW9uLmxlbmd0aCA8PSAxNjApIG1ldGFkYXRhICs9IDY7XG4gIGVsc2UgaWYgKGRhdGEubWV0YURlc2NyaXB0aW9uKSBtZXRhZGF0YSArPSAzO1xuXG4gIGlmIChkYXRhLmNhbm9uaWNhbFVybCkgbWV0YWRhdGEgKz0gNDtcblxuICAvLyAyLiBIZWFkaW5ncyAoMTUgcHRzKVxuICBsZXQgaGVhZGluZ3MgPSAwO1xuICBpZiAoZGF0YS5oMVRhZ3MubGVuZ3RoID09PSAxKSBoZWFkaW5ncyArPSA5O1xuICBlbHNlIGlmIChkYXRhLmgxVGFncy5sZW5ndGggPiAxKSBoZWFkaW5ncyArPSA0OyAvLyBtdWx0aXBsZSBIMXMgaXMgYmFkXG4gIGlmIChkYXRhLmgyVGFncy5sZW5ndGggPj0gMikgaGVhZGluZ3MgKz0gNjtcbiAgZWxzZSBpZiAoZGF0YS5oMlRhZ3MubGVuZ3RoID09PSAxKSBoZWFkaW5ncyArPSAzO1xuXG4gIC8vIDMuIFNjaGVtYSAoMjAgcHRzKVxuICBsZXQgc2NoZW1hID0gMDtcbiAgaWYgKGRhdGEuanNvbkxkQmxvY2tzLmxlbmd0aCA+IDApIHNjaGVtYSArPSA4O1xuICBjb25zdCB1c2VmdWxGb3VuZCA9IGRhdGEuc2NoZW1hVHlwZXMuZmlsdGVyKCh0KSA9PlxuICAgIFVTRUZVTF9TQ0hFTUFfVFlQRVMuaW5jbHVkZXModClcbiAgKTtcbiAgaWYgKHVzZWZ1bEZvdW5kLmxlbmd0aCA+PSAzKSBzY2hlbWEgKz0gMTI7XG4gIGVsc2UgaWYgKHVzZWZ1bEZvdW5kLmxlbmd0aCA9PT0gMikgc2NoZW1hICs9IDk7XG4gIGVsc2UgaWYgKHVzZWZ1bEZvdW5kLmxlbmd0aCA9PT0gMSkgc2NoZW1hICs9IDU7XG5cbiAgLy8gNC4gQ29udGVudCBjbGFyaXR5ICgyMCBwdHMpXG4gIGxldCBjb250ZW50Q2xhcml0eSA9IDA7XG4gIGNvbnN0IGJvZHlMb3dlciA9IGRhdGEuYm9keVRleHQudG9Mb3dlckNhc2UoKTtcbiAgaWYgKGRhdGEuYm9keVRleHQubGVuZ3RoID4gNTAwKSBjb250ZW50Q2xhcml0eSArPSA4O1xuICBlbHNlIGlmIChkYXRhLmJvZHlUZXh0Lmxlbmd0aCA+IDIwMCkgY29udGVudENsYXJpdHkgKz0gNDtcblxuICBjb25zdCBoYXNBdWRpZW5jZSA9IEFVRElFTkNFX0tFWVdPUkRTLnNvbWUoKGt3KSA9PiBib2R5TG93ZXIuaW5jbHVkZXMoa3cpKTtcbiAgaWYgKGhhc0F1ZGllbmNlKSBjb250ZW50Q2xhcml0eSArPSA2O1xuXG4gIGNvbnN0IGhhc1Byb2R1Y3REZXNjID1cbiAgICBkYXRhLm9nRGVzY3JpcHRpb24ubGVuZ3RoID4gMjAgfHwgZGF0YS5tZXRhRGVzY3JpcHRpb24ubGVuZ3RoID4gMjA7XG4gIGlmIChoYXNQcm9kdWN0RGVzYykgY29udGVudENsYXJpdHkgKz0gNjtcblxuICAvLyA1LiBBSSBBbnN3ZXIgUmVhZGluZXNzICgxNSBwdHMpXG4gIGxldCBhaVJlYWRpbmVzcyA9IDA7XG4gIGNvbnN0IGhhc0ZhcSA9IEZBUV9LRVlXT1JEUy5zb21lKChrdykgPT4gYm9keUxvd2VyLmluY2x1ZGVzKGt3KSk7XG4gIGlmIChoYXNGYXEpIGFpUmVhZGluZXNzICs9IDU7XG5cbiAgY29uc3QgaGFzRmFxU2NoZW1hID0gZGF0YS5zY2hlbWFUeXBlcy5pbmNsdWRlcyhcIkZBUVBhZ2VcIik7XG4gIGlmIChoYXNGYXFTY2hlbWEpIGFpUmVhZGluZXNzICs9IDU7XG5cbiAgY29uc3QgaGFzRW50aXR5U2lnbmFscyA9XG4gICAgZGF0YS5zY2hlbWFUeXBlcy5pbmNsdWRlcyhcIk9yZ2FuaXphdGlvblwiKSB8fFxuICAgIGRhdGEuc2NoZW1hVHlwZXMuaW5jbHVkZXMoXCJQcm9kdWN0XCIpIHx8XG4gICAgZGF0YS5zY2hlbWFUeXBlcy5pbmNsdWRlcyhcIlNlcnZpY2VcIik7XG4gIGlmIChoYXNFbnRpdHlTaWduYWxzKSBhaVJlYWRpbmVzcyArPSA1O1xuXG4gIC8vIDYuIFBlcmZvcm1hbmNlICgxNSBwdHMpXG4gIGxldCBwZXJmb3JtYW5jZSA9IDA7XG4gIGlmIChwYWdlU3BlZWRTY29yZSAhPT0gbnVsbCkge1xuICAgIGlmIChwYWdlU3BlZWRTY29yZSA+PSA5MCkgcGVyZm9ybWFuY2UgPSAxNTtcbiAgICBlbHNlIGlmIChwYWdlU3BlZWRTY29yZSA+PSA3NSkgcGVyZm9ybWFuY2UgPSAxMjtcbiAgICBlbHNlIGlmIChwYWdlU3BlZWRTY29yZSA+PSA1MCkgcGVyZm9ybWFuY2UgPSA4O1xuICAgIGVsc2UgcGVyZm9ybWFuY2UgPSA0O1xuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBlc3RpbWF0ZSBiYXNlZCBvbiBjb250ZW50IHNpZ25hbHNcbiAgICBpZiAoZGF0YS5pbWFnZXNNaXNzaW5nQWx0ID09PSAwICYmIGRhdGEuaW1hZ2VDb3VudCA+IDApIHBlcmZvcm1hbmNlICs9IDQ7XG4gICAgaWYgKGRhdGEuYm9keVRleHQubGVuZ3RoID4gMzAwKSBwZXJmb3JtYW5jZSArPSA0O1xuICAgIGlmIChkYXRhLmNhbm9uaWNhbFVybCkgcGVyZm9ybWFuY2UgKz0gMztcbiAgICBpZiAoZGF0YS5zY2hlbWFUeXBlcy5sZW5ndGggPiAwKSBwZXJmb3JtYW5jZSArPSA0O1xuICB9XG5cbiAgY29uc3QgdG90YWwgPSBNYXRoLm1pbihcbiAgICAxMDAsXG4gICAgbWV0YWRhdGEgKyBoZWFkaW5ncyArIHNjaGVtYSArIGNvbnRlbnRDbGFyaXR5ICsgYWlSZWFkaW5lc3MgKyBwZXJmb3JtYW5jZVxuICApO1xuXG4gIHJldHVybiB7XG4gICAgbWV0YWRhdGE6IE1hdGgubWluKDE1LCBtZXRhZGF0YSksXG4gICAgaGVhZGluZ3M6IE1hdGgubWluKDE1LCBoZWFkaW5ncyksXG4gICAgc2NoZW1hOiBNYXRoLm1pbigyMCwgc2NoZW1hKSxcbiAgICBjb250ZW50Q2xhcml0eTogTWF0aC5taW4oMjAsIGNvbnRlbnRDbGFyaXR5KSxcbiAgICBhaUFuc3dlclJlYWRpbmVzczogTWF0aC5taW4oMTUsIGFpUmVhZGluZXNzKSxcbiAgICBwZXJmb3JtYW5jZTogTWF0aC5taW4oMTUsIHBlcmZvcm1hbmNlKSxcbiAgICB0b3RhbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjb3JlTGFiZWxBbmRDb2xvcih0b3RhbDogbnVtYmVyKToge1xuICBsYWJlbDogc3RyaW5nO1xuICBjb2xvcjogc3RyaW5nO1xuICBncmFkaWVudDogc3RyaW5nO1xufSB7XG4gIGlmICh0b3RhbCA+PSA4NSlcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IFwiRXhjZWxsZW50XCIsXG4gICAgICBjb2xvcjogXCIjMjJjNTVlXCIsXG4gICAgICBncmFkaWVudDogXCJmcm9tLWVtZXJhbGQtNDAwIHRvLWdyZWVuLTUwMFwiLFxuICAgIH07XG4gIGlmICh0b3RhbCA+PSA3MClcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IFwiU3Ryb25nXCIsXG4gICAgICBjb2xvcjogXCIjM2I4MmY2XCIsXG4gICAgICBncmFkaWVudDogXCJmcm9tLWJsdWUtNDAwIHRvLWluZGlnby01MDBcIixcbiAgICB9O1xuICBpZiAodG90YWwgPj0gNTApXG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiBcIk5lZWRzIFdvcmtcIixcbiAgICAgIGNvbG9yOiBcIiNmNTllMGJcIixcbiAgICAgIGdyYWRpZW50OiBcImZyb20tYW1iZXItNDAwIHRvLW9yYW5nZS01MDBcIixcbiAgICB9O1xuICByZXR1cm4ge1xuICAgIGxhYmVsOiBcIlBvb3JcIixcbiAgICBjb2xvcjogXCIjZWY0NDQ0XCIsXG4gICAgZ3JhZGllbnQ6IFwiZnJvbS1yZWQtNDAwIHRvLXJvc2UtNjAwXCIsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGYWxsYmFja0FuYWx5c2lzKGRhdGE6IEV4dHJhY3RlZERhdGEsIHNjb3JlczogU2NvcmVCcmVha2Rvd24pIHtcbiAgY29uc3Qgd2Vha25lc3Nlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZml4ZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNjaGVtYVJlY3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHNjb3Jlcy5tZXRhZGF0YSA8IDEwKSB7XG4gICAgd2Vha25lc3Nlcy5wdXNoKFwiTWV0YSB0aXRsZSBvciBkZXNjcmlwdGlvbiBpcyBtaXNzaW5nIG9yIHBvb3JseSBvcHRpbWl6ZWQuXCIpO1xuICAgIGZpeGVzLnB1c2goXCJBZGQgYSBkZXNjcmlwdGl2ZSBtZXRhIHRpdGxlICg1MOKAkzcwIGNoYXJzKSBhbmQgbWV0YSBkZXNjcmlwdGlvbiAoMTIw4oCTMTU1IGNoYXJzKS5cIik7XG4gIH1cbiAgaWYgKHNjb3Jlcy5zY2hlbWEgPCAxMCkge1xuICAgIHdlYWtuZXNzZXMucHVzaChcIk5vIEpTT04tTEQgc3RydWN0dXJlZCBkYXRhIGRldGVjdGVkLlwiKTtcbiAgICBmaXhlcy5wdXNoKFwiQWRkIE9yZ2FuaXphdGlvbiBhbmQgV2ViU2l0ZSBKU09OLUxEIHNjaGVtYSB0byBoZWxwIEFJIGVuZ2luZXMgdW5kZXJzdGFuZCB5b3VyIGJyYW5kLlwiKTtcbiAgICBzY2hlbWFSZWNzLnB1c2goXCJBZGQgYE9yZ2FuaXphdGlvbmAgc2NoZW1hIHdpdGggbmFtZSwgdXJsLCBsb2dvLCBhbmQgZGVzY3JpcHRpb24gZmllbGRzLlwiKTtcbiAgICBzY2hlbWFSZWNzLnB1c2goXCJBZGQgYFdlYlNpdGVgIHNjaGVtYSB3aXRoIFNlYXJjaEFjdGlvbiB0byBlbmFibGUgc2l0ZWxpbmtzIHNlYXJjaCBib3guXCIpO1xuICB9XG4gIGlmIChzY29yZXMuYWlBbnN3ZXJSZWFkaW5lc3MgPCA4KSB7XG4gICAgd2Vha25lc3Nlcy5wdXNoKFwiTm8gRkFRIGNvbnRlbnQgb3IgRkFRIHNjaGVtYSBmb3VuZC5cIik7XG4gICAgZml4ZXMucHVzaChcIkNyZWF0ZSBhbiBGQVEgc2VjdGlvbiBhbmQgbWFyayBpdCB1cCB3aXRoIEZBUVBhZ2UgSlNPTi1MRCBzY2hlbWEuXCIpO1xuICAgIHNjaGVtYVJlY3MucHVzaChcIkFkZCBgRkFRUGFnZWAgc2NoZW1hIHdpdGggYXQgbGVhc3QgNSBxdWVzdGlvbnMgeW91ciBjdXN0b21lcnMgYXNrLlwiKTtcbiAgfVxuICBpZiAoZGF0YS5oMVRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgd2Vha25lc3Nlcy5wdXNoKFwiTm8gSDEgdGFnIGRldGVjdGVkIG9uIHRoZSBwYWdlLlwiKTtcbiAgICBmaXhlcy5wdXNoKFwiQWRkIGEgY2xlYXIsIGtleXdvcmQtcmljaCBIMSBoZWFkaW5nIHRoYXQgZGVzY3JpYmVzIHdoYXQgeW91ciBwYWdlIGlzIGFib3V0LlwiKTtcbiAgfVxuICBpZiAoZGF0YS5pbWFnZXNNaXNzaW5nQWx0ID4gMCkge1xuICAgIHdlYWtuZXNzZXMucHVzaChgJHtkYXRhLmltYWdlc01pc3NpbmdBbHR9IGltYWdlKHMpIGFyZSBtaXNzaW5nIGFsdCB0ZXh0LmApO1xuICAgIGZpeGVzLnB1c2goXCJBZGQgZGVzY3JpcHRpdmUgYWx0IHRleHQgdG8gYWxsIGltYWdlcyB0byBpbXByb3ZlIGFjY2Vzc2liaWxpdHkgYW5kIEFJIGluZGV4aW5nLlwiKTtcbiAgfVxuICBpZiAoIWRhdGEuY2Fub25pY2FsVXJsKSB7XG4gICAgd2Vha25lc3Nlcy5wdXNoKFwiTm8gY2Fub25pY2FsIFVSTCB0YWcgZm91bmQuXCIpO1xuICAgIGZpeGVzLnB1c2goXCJBZGQgYSBjYW5vbmljYWwgPGxpbms+IHRhZyB0byBwcmV2ZW50IGR1cGxpY2F0ZSBjb250ZW50IGlzc3Vlcy5cIik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBsYWluRW5nbGlzaFN1bW1hcnk6XG4gICAgICBcIlRoaXMgcGFnZSB3YXMgYW5hbHl6ZWQgdXNpbmcgZGV0ZXJtaW5pc3RpYyBjaGVja3MuIEFkZCBhbiBPcGVuQUkgQVBJIGtleSBmb3IgYSBmdWxsIEFJLXBvd2VyZWQgYW5hbHlzaXMuXCIsXG4gICAgZGV0ZWN0ZWRCdXNpbmVzc1R5cGU6IFwiVW5rbm93biDigJQgYWRkIE9wZW5BSSBrZXkgZm9yIEFJIGRldGVjdGlvblwiLFxuICAgIHRhcmdldEF1ZGllbmNlOiBcIlVua25vd24g4oCUIGFkZCBPcGVuQUkga2V5IGZvciBBSSBkZXRlY3Rpb25cIixcbiAgICBkZXRlY3RlZEVudGl0aWVzOiBkYXRhLnNjaGVtYVR5cGVzLmxlbmd0aCA+IDAgPyBkYXRhLnNjaGVtYVR5cGVzIDogW1wiTm9uZSBkZXRlY3RlZFwiXSxcbiAgICBtaXNzaW5nRW50aXRpZXM6IFtcIk9wZW5BSSBrZXkgcmVxdWlyZWQgZm9yIGVudGl0eSBhbmFseXNpc1wiXSxcbiAgICBhaVNlYXJjaFdlYWtuZXNzZXM6IHdlYWtuZXNzZXMubGVuZ3RoID4gMCA/IHdlYWtuZXNzZXMgOiBbXCJObyBjcml0aWNhbCB3ZWFrbmVzc2VzIGRldGVjdGVkLlwiXSxcbiAgICBoaWdoSW1wYWN0Rml4ZXM6IGZpeGVzLmxlbmd0aCA+IDAgPyBmaXhlcyA6IFtcIllvdXIgcGFnZSBsb29rcyByZWFzb25hYmx5IHdlbGwtb3B0aW1pemVkLlwiXSxcbiAgICByZWNvbW1lbmRlZEZhcXM6IFtcbiAgICAgIHtcbiAgICAgICAgcXVlc3Rpb246IFwiV2hhdCBkb2VzIHlvdXIgcHJvZHVjdC9zZXJ2aWNlIGRvP1wiLFxuICAgICAgICBhbnN3ZXI6IFwiQWRkIGEgY2xlYXIgb25lLXNlbnRlbmNlIGFuc3dlciBoZXJlIGJhc2VkIG9uIHlvdXIgb2ZmZXJpbmcuXCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBxdWVzdGlvbjogXCJXaG8gaXMgdGhpcyBmb3I/XCIsXG4gICAgICAgIGFuc3dlcjogXCJEZXNjcmliZSB5b3VyIGlkZWFsIGN1c3RvbWVyIG9yIHVzZXIgcGVyc29uYS5cIixcbiAgICAgIH0sXG4gICAgXSxcbiAgICBzY2hlbWFSZWNvbW1lbmRhdGlvbnM6XG4gICAgICBzY2hlbWFSZWNzLmxlbmd0aCA+IDBcbiAgICAgICAgPyBzY2hlbWFSZWNzXG4gICAgICAgIDogW1wiWW91ciBzY2hlbWEgc2V0dXAgbG9va3MgcmVhc29uYWJsZS4gQ29uc2lkZXIgYWRkaW5nIEZBUVBhZ2Ugc2NoZW1hLlwiXSxcbiAgICBmaW5hbFZlcmRpY3Q6IGBZb3VyIHNpdGUgc2NvcmVkICR7c2NvcmVzLnRvdGFsfS8xMDAuICR7c2NvcmVzLnRvdGFsID49IDcwID8gXCJHb29kIGZvdW5kYXRpb24g4oCUIGZvY3VzIG9uIHNjaGVtYSBhbmQgRkFRIGNvbnRlbnQgdG8gYm9vc3QgQUkgdmlzaWJpbGl0eS5cIiA6IFwiU2lnbmlmaWNhbnQgZ2FwcyBpbiBzY2hlbWEsIG1ldGFkYXRhLCBvciBjb250ZW50IGNsYXJpdHkgYXJlIGxpbWl0aW5nIEFJIGRpc2NvdmVyYWJpbGl0eS5cIn1gLFxuICB9O1xufVxuIl0sIm5hbWVzIjpbIlVTRUZVTF9TQ0hFTUFfVFlQRVMiLCJGQVFfS0VZV09SRFMiLCJBVURJRU5DRV9LRVlXT1JEUyIsImNhbGN1bGF0ZVNjb3JlcyIsImRhdGEiLCJwYWdlU3BlZWRTY29yZSIsIm1ldGFkYXRhIiwicGFnZVRpdGxlIiwibGVuZ3RoIiwibWV0YURlc2NyaXB0aW9uIiwiY2Fub25pY2FsVXJsIiwiaGVhZGluZ3MiLCJoMVRhZ3MiLCJoMlRhZ3MiLCJzY2hlbWEiLCJqc29uTGRCbG9ja3MiLCJ1c2VmdWxGb3VuZCIsInNjaGVtYVR5cGVzIiwiZmlsdGVyIiwidCIsImluY2x1ZGVzIiwiY29udGVudENsYXJpdHkiLCJib2R5TG93ZXIiLCJib2R5VGV4dCIsInRvTG93ZXJDYXNlIiwiaGFzQXVkaWVuY2UiLCJzb21lIiwia3ciLCJoYXNQcm9kdWN0RGVzYyIsIm9nRGVzY3JpcHRpb24iLCJhaVJlYWRpbmVzcyIsImhhc0ZhcSIsImhhc0ZhcVNjaGVtYSIsImhhc0VudGl0eVNpZ25hbHMiLCJwZXJmb3JtYW5jZSIsImltYWdlc01pc3NpbmdBbHQiLCJpbWFnZUNvdW50IiwidG90YWwiLCJNYXRoIiwibWluIiwiYWlBbnN3ZXJSZWFkaW5lc3MiLCJzY29yZUxhYmVsQW5kQ29sb3IiLCJsYWJlbCIsImNvbG9yIiwiZ3JhZGllbnQiLCJnZXRGYWxsYmFja0FuYWx5c2lzIiwic2NvcmVzIiwid2Vha25lc3NlcyIsImZpeGVzIiwic2NoZW1hUmVjcyIsInB1c2giLCJwbGFpbkVuZ2xpc2hTdW1tYXJ5IiwiZGV0ZWN0ZWRCdXNpbmVzc1R5cGUiLCJ0YXJnZXRBdWRpZW5jZSIsImRldGVjdGVkRW50aXRpZXMiLCJtaXNzaW5nRW50aXRpZXMiLCJhaVNlYXJjaFdlYWtuZXNzZXMiLCJoaWdoSW1wYWN0Rml4ZXMiLCJyZWNvbW1lbmRlZEZhcXMiLCJxdWVzdGlvbiIsImFuc3dlciIsInNjaGVtYVJlY29tbWVuZGF0aW9ucyIsImZpbmFsVmVyZGljdCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/score.ts\n");

/***/ }),

/***/ "(rsc)/./lib/scrape.ts":
/*!***********************!*\
  !*** ./lib/scrape.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   fetchHtml: () => (/* binding */ fetchHtml),\n/* harmony export */   normalizeUrl: () => (/* binding */ normalizeUrl),\n/* harmony export */   parseHtml: () => (/* binding */ parseHtml),\n/* harmony export */   validateUrl: () => (/* binding */ validateUrl)\n/* harmony export */ });\n/* harmony import */ var cheerio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! cheerio */ \"(rsc)/./node_modules/cheerio/dist/esm/index.js\");\n\nfunction normalizeUrl(input) {\n    const trimmed = input.trim();\n    if (!trimmed.startsWith(\"http://\") && !trimmed.startsWith(\"https://\")) {\n        return `https://${trimmed}`;\n    }\n    return trimmed;\n}\nfunction validateUrl(url) {\n    try {\n        const parsed = new URL(url);\n        return parsed.protocol === \"http:\" || parsed.protocol === \"https:\";\n    } catch  {\n        return false;\n    }\n}\nasync function fetchHtml(url) {\n    const controller = new AbortController();\n    const timeout = setTimeout(()=>controller.abort(), 12000);\n    try {\n        const res = await fetch(url, {\n            signal: controller.signal,\n            headers: {\n                \"User-Agent\": \"Mozilla/5.0 (compatible; AnswerRankScanner/1.0; +https://answerrankscanner.com)\",\n                Accept: \"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\",\n                \"Accept-Language\": \"en-US,en;q=0.5\"\n            }\n        });\n        if (!res.ok) {\n            throw new Error(`HTTP ${res.status}: ${res.statusText}`);\n        }\n        const contentType = res.headers.get(\"content-type\") || \"\";\n        if (!contentType.includes(\"text/html\") && !contentType.includes(\"text/plain\")) {\n            throw new Error(\"URL does not return an HTML page.\");\n        }\n        return await res.text();\n    } finally{\n        clearTimeout(timeout);\n    }\n}\nfunction parseHtml(html, baseUrl) {\n    const $ = cheerio__WEBPACK_IMPORTED_MODULE_0__.load(html);\n    const parsedBase = new URL(baseUrl);\n    // Basic metadata\n    const pageTitle = $(\"title\").first().text().trim();\n    const metaDescription = $('meta[name=\"description\"]').attr(\"content\")?.trim() ?? \"\";\n    const canonicalUrl = $('link[rel=\"canonical\"]').attr(\"href\")?.trim() ?? \"\";\n    // Open Graph\n    const ogTitle = $('meta[property=\"og:title\"]').attr(\"content\")?.trim() ?? \"\";\n    const ogDescription = $('meta[property=\"og:description\"]').attr(\"content\")?.trim() ?? \"\";\n    // Twitter\n    const twitterTitle = $('meta[name=\"twitter:title\"]').attr(\"content\")?.trim() ?? \"\";\n    const twitterDescription = $('meta[name=\"twitter:description\"]').attr(\"content\")?.trim() ?? \"\";\n    // Headings\n    const h1Tags = [];\n    $(\"h1\").each((_, el)=>{\n        const text = $(el).text().trim();\n        if (text) h1Tags.push(text);\n    });\n    const h2Tags = [];\n    $(\"h2\").each((_, el)=>{\n        const text = $(el).text().trim();\n        if (text) h2Tags.push(text);\n    });\n    // JSON-LD schemas\n    const jsonLdBlocks = [];\n    const schemaTypes = [];\n    $('script[type=\"application/ld+json\"]').each((_, el)=>{\n        try {\n            const parsed = JSON.parse($(el).html() || \"\");\n            jsonLdBlocks.push(parsed);\n            const types = Array.isArray(parsed) ? parsed : [\n                parsed\n            ];\n            types.forEach((item)=>{\n                if (item[\"@type\"]) {\n                    const t = Array.isArray(item[\"@type\"]) ? item[\"@type\"] : [\n                        item[\"@type\"]\n                    ];\n                    schemaTypes.push(...t);\n                }\n            });\n        } catch  {\n        // ignore malformed JSON-LD\n        }\n    });\n    // Images\n    const images = $(\"img\");\n    const imageCount = images.length;\n    let imagesMissingAlt = 0;\n    images.each((_, el)=>{\n        const alt = $(el).attr(\"alt\");\n        if (!alt || alt.trim() === \"\") imagesMissingAlt++;\n    });\n    // Links\n    let internalLinks = 0;\n    let externalLinks = 0;\n    $(\"a[href]\").each((_, el)=>{\n        const href = $(el).attr(\"href\") || \"\";\n        try {\n            const resolved = new URL(href, baseUrl);\n            if (resolved.hostname === parsedBase.hostname) {\n                internalLinks++;\n            } else {\n                externalLinks++;\n            }\n        } catch  {\n            // relative link\n            internalLinks++;\n        }\n    });\n    // Body text\n    $(\"script, style, noscript, nav, footer, header\").remove();\n    const rawText = $(\"body\").text().replace(/\\s+/g, \" \").trim();\n    const bodyText = rawText.slice(0, 8000);\n    return {\n        pageTitle,\n        metaDescription,\n        h1Tags,\n        h2Tags,\n        canonicalUrl,\n        ogTitle,\n        ogDescription,\n        twitterTitle,\n        twitterDescription,\n        jsonLdBlocks,\n        schemaTypes,\n        imageCount,\n        imagesMissingAlt,\n        internalLinks,\n        externalLinks,\n        bodyText\n    };\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LFFBQVEsRUFBRTtnQkFDN0NKO1lBQ0YsT0FBTztnQkFDTEM7WUFDRjtRQUNGLEVBQUUsT0FBTTtZQUNOLGdCQUFnQjtZQUNoQkQ7UUFDRjtJQUNGO0lBRUEsWUFBWTtJQUNaakMsRUFBRSxnREFBZ0RzQyxNQUFNO0lBQ3hELE1BQU1DLFVBQVV2QyxFQUFFLFFBQVFMLElBQUksR0FBRzZDLE9BQU8sQ0FBQyxRQUFRLEtBQUt0RSxJQUFJO0lBQzFELE1BQU11RSxXQUFXRixRQUFRRyxLQUFLLENBQUMsR0FBRztJQUVsQyxPQUFPO1FBQ0x2QztRQUNBRTtRQUNBTztRQUNBSztRQUNBVjtRQUNBQztRQUNBQztRQUNBQztRQUNBQztRQUNBTztRQUNBQztRQUNBVTtRQUNBRTtRQUNBRTtRQUNBQztRQUNBTztJQUNGO0FBQ0YiLCJzb3VyY2VzIjpbIkQ6XFxBbnN3ZXJSYW5rIFNjYW5uZXJcXGxpYlxcc2NyYXBlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoZWVyaW8gZnJvbSBcImNoZWVyaW9cIjtcbmltcG9ydCB7IEV4dHJhY3RlZERhdGEgfSBmcm9tIFwiQC90eXBlcy9yZXBvcnRcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVVybChpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZCA9IGlucHV0LnRyaW0oKTtcbiAgaWYgKCF0cmltbWVkLnN0YXJ0c1dpdGgoXCJodHRwOi8vXCIpICYmICF0cmltbWVkLnN0YXJ0c1dpdGgoXCJodHRwczovL1wiKSkge1xuICAgIHJldHVybiBgaHR0cHM6Ly8ke3RyaW1tZWR9YDtcbiAgfVxuICByZXR1cm4gdHJpbW1lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlVXJsKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICAgIHJldHVybiBwYXJzZWQucHJvdG9jb2wgPT09IFwiaHR0cDpcIiB8fCBwYXJzZWQucHJvdG9jb2wgPT09IFwiaHR0cHM6XCI7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hIdG1sKHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCAxMjAwMCk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiVXNlci1BZ2VudFwiOlxuICAgICAgICAgIFwiTW96aWxsYS81LjAgKGNvbXBhdGlibGU7IEFuc3dlclJhbmtTY2FubmVyLzEuMDsgK2h0dHBzOi8vYW5zd2VycmFua3NjYW5uZXIuY29tKVwiLFxuICAgICAgICBBY2NlcHQ6XG4gICAgICAgICAgXCJ0ZXh0L2h0bWwsYXBwbGljYXRpb24veGh0bWwreG1sLGFwcGxpY2F0aW9uL3htbDtxPTAuOSwqLyo7cT0wLjhcIixcbiAgICAgICAgXCJBY2NlcHQtTGFuZ3VhZ2VcIjogXCJlbi1VUyxlbjtxPTAuNVwiLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmICghcmVzLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXMuc3RhdHVzfTogJHtyZXMuc3RhdHVzVGV4dH1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZW50VHlwZSA9IHJlcy5oZWFkZXJzLmdldChcImNvbnRlbnQtdHlwZVwiKSB8fCBcIlwiO1xuICAgIGlmICghY29udGVudFR5cGUuaW5jbHVkZXMoXCJ0ZXh0L2h0bWxcIikgJiYgIWNvbnRlbnRUeXBlLmluY2x1ZGVzKFwidGV4dC9wbGFpblwiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVVJMIGRvZXMgbm90IHJldHVybiBhbiBIVE1MIHBhZ2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBhd2FpdCByZXMudGV4dCgpO1xuICB9IGZpbmFsbHkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VIdG1sKGh0bWw6IHN0cmluZywgYmFzZVVybDogc3RyaW5nKTogRXh0cmFjdGVkRGF0YSB7XG4gIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoaHRtbCk7XG4gIGNvbnN0IHBhcnNlZEJhc2UgPSBuZXcgVVJMKGJhc2VVcmwpO1xuXG4gIC8vIEJhc2ljIG1ldGFkYXRhXG4gIGNvbnN0IHBhZ2VUaXRsZSA9ICQoXCJ0aXRsZVwiKS5maXJzdCgpLnRleHQoKS50cmltKCk7XG4gIGNvbnN0IG1ldGFEZXNjcmlwdGlvbiA9XG4gICAgJCgnbWV0YVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5hdHRyKFwiY29udGVudFwiKT8udHJpbSgpID8/IFwiXCI7XG4gIGNvbnN0IGNhbm9uaWNhbFVybCA9XG4gICAgJCgnbGlua1tyZWw9XCJjYW5vbmljYWxcIl0nKS5hdHRyKFwiaHJlZlwiKT8udHJpbSgpID8/IFwiXCI7XG5cbiAgLy8gT3BlbiBHcmFwaFxuICBjb25zdCBvZ1RpdGxlID1cbiAgICAkKCdtZXRhW3Byb3BlcnR5PVwib2c6dGl0bGVcIl0nKS5hdHRyKFwiY29udGVudFwiKT8udHJpbSgpID8/IFwiXCI7XG4gIGNvbnN0IG9nRGVzY3JpcHRpb24gPVxuICAgICQoJ21ldGFbcHJvcGVydHk9XCJvZzpkZXNjcmlwdGlvblwiXScpLmF0dHIoXCJjb250ZW50XCIpPy50cmltKCkgPz8gXCJcIjtcblxuICAvLyBUd2l0dGVyXG4gIGNvbnN0IHR3aXR0ZXJUaXRsZSA9XG4gICAgJCgnbWV0YVtuYW1lPVwidHdpdHRlcjp0aXRsZVwiXScpLmF0dHIoXCJjb250ZW50XCIpPy50cmltKCkgPz8gXCJcIjtcbiAgY29uc3QgdHdpdHRlckRlc2NyaXB0aW9uID1cbiAgICAkKCdtZXRhW25hbWU9XCJ0d2l0dGVyOmRlc2NyaXB0aW9uXCJdJykuYXR0cihcImNvbnRlbnRcIik/LnRyaW0oKSA/PyBcIlwiO1xuXG4gIC8vIEhlYWRpbmdzXG4gIGNvbnN0IGgxVGFnczogc3RyaW5nW10gPSBbXTtcbiAgJChcImgxXCIpLmVhY2goKF8sIGVsKSA9PiB7XG4gICAgY29uc3QgdGV4dCA9ICQoZWwpLnRleHQoKS50cmltKCk7XG4gICAgaWYgKHRleHQpIGgxVGFncy5wdXNoKHRleHQpO1xuICB9KTtcblxuICBjb25zdCBoMlRhZ3M6IHN0cmluZ1tdID0gW107XG4gICQoXCJoMlwiKS5lYWNoKChfLCBlbCkgPT4ge1xuICAgIGNvbnN0IHRleHQgPSAkKGVsKS50ZXh0KCkudHJpbSgpO1xuICAgIGlmICh0ZXh0KSBoMlRhZ3MucHVzaCh0ZXh0KTtcbiAgfSk7XG5cbiAgLy8gSlNPTi1MRCBzY2hlbWFzXG4gIGNvbnN0IGpzb25MZEJsb2Nrczogb2JqZWN0W10gPSBbXTtcbiAgY29uc3Qgc2NoZW1hVHlwZXM6IHN0cmluZ1tdID0gW107XG4gICQoJ3NjcmlwdFt0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiXScpLmVhY2goKF8sIGVsKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoJChlbCkuaHRtbCgpIHx8IFwiXCIpO1xuICAgICAganNvbkxkQmxvY2tzLnB1c2gocGFyc2VkKTtcbiAgICAgIGNvbnN0IHR5cGVzID0gQXJyYXkuaXNBcnJheShwYXJzZWQpID8gcGFyc2VkIDogW3BhcnNlZF07XG4gICAgICB0eXBlcy5mb3JFYWNoKChpdGVtOiB7IFwiQHR5cGVcIj86IHN0cmluZyB8IHN0cmluZ1tdIH0pID0+IHtcbiAgICAgICAgaWYgKGl0ZW1bXCJAdHlwZVwiXSkge1xuICAgICAgICAgIGNvbnN0IHQgPSBBcnJheS5pc0FycmF5KGl0ZW1bXCJAdHlwZVwiXSkgPyBpdGVtW1wiQHR5cGVcIl0gOiBbaXRlbVtcIkB0eXBlXCJdXTtcbiAgICAgICAgICBzY2hlbWFUeXBlcy5wdXNoKC4uLnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGlnbm9yZSBtYWxmb3JtZWQgSlNPTi1MRFxuICAgIH1cbiAgfSk7XG5cbiAgLy8gSW1hZ2VzXG4gIGNvbnN0IGltYWdlcyA9ICQoXCJpbWdcIik7XG4gIGNvbnN0IGltYWdlQ291bnQgPSBpbWFnZXMubGVuZ3RoO1xuICBsZXQgaW1hZ2VzTWlzc2luZ0FsdCA9IDA7XG4gIGltYWdlcy5lYWNoKChfLCBlbCkgPT4ge1xuICAgIGNvbnN0IGFsdCA9ICQoZWwpLmF0dHIoXCJhbHRcIik7XG4gICAgaWYgKCFhbHQgfHwgYWx0LnRyaW0oKSA9PT0gXCJcIikgaW1hZ2VzTWlzc2luZ0FsdCsrO1xuICB9KTtcblxuICAvLyBMaW5rc1xuICBsZXQgaW50ZXJuYWxMaW5rcyA9IDA7XG4gIGxldCBleHRlcm5hbExpbmtzID0gMDtcbiAgJChcImFbaHJlZl1cIikuZWFjaCgoXywgZWwpID0+IHtcbiAgICBjb25zdCBocmVmID0gJChlbCkuYXR0cihcImhyZWZcIikgfHwgXCJcIjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSBuZXcgVVJMKGhyZWYsIGJhc2VVcmwpO1xuICAgICAgaWYgKHJlc29sdmVkLmhvc3RuYW1lID09PSBwYXJzZWRCYXNlLmhvc3RuYW1lKSB7XG4gICAgICAgIGludGVybmFsTGlua3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4dGVybmFsTGlua3MrKztcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIHJlbGF0aXZlIGxpbmtcbiAgICAgIGludGVybmFsTGlua3MrKztcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEJvZHkgdGV4dFxuICAkKFwic2NyaXB0LCBzdHlsZSwgbm9zY3JpcHQsIG5hdiwgZm9vdGVyLCBoZWFkZXJcIikucmVtb3ZlKCk7XG4gIGNvbnN0IHJhd1RleHQgPSAkKFwiYm9keVwiKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xuICBjb25zdCBib2R5VGV4dCA9IHJhd1RleHQuc2xpY2UoMCwgODAwMCk7XG5cbiAgcmV0dXJuIHtcbiAgICBwYWdlVGl0bGUsXG4gICAgbWV0YURlc2NyaXB0aW9uLFxuICAgIGgxVGFncyxcbiAgICBoMlRhZ3MsXG4gICAgY2Fub25pY2FsVXJsLFxuICAgIG9nVGl0bGUsXG4gICAgb2dEZXNjcmlwdGlvbixcbiAgICB0d2l0dGVyVGl0bGUsXG4gICAgdHdpdHRlckRlc2NyaXB0aW9uLFxuICAgIGpzb25MZEJsb2NrcyxcbiAgICBzY2hlbWFUeXBlcyxcbiAgICBpbWFnZUNvdW50LFxuICAgIGltYWdlc01pc3NpbmdBbHQsXG4gICAgaW50ZXJuYWxMaW5rcyxcbiAgICBleHRlcm5hbExpbmtzLFxuICAgIGJvZHlUZXh0LFxuICB9O1xufVxuIl0sIm5hbWVzIjpbImNoZWVyaW8iLCJub3JtYWxpemVVcmwiLCJpbnB1dCIsInRyaW1tZWQiLCJ0cmltIiwic3RhcnRzV2l0aCIsInZhbGlkYXRlVXJsIiwidXJsIiwicGFyc2VkIiwiVVJMIiwicHJvdG9jb2wiLCJmZXRjaEh0bWwiLCJjb250cm9sbGVyIiwiQWJvcnRDb250cm9sbGVyIiwidGltZW91dCIsInNldFRpbWVvdXQiLCJhYm9ydCIsInJlcyIsImZldGNoIiwic2lnbmFsIiwiaGVhZGVycyIsIkFjY2VwdCIsIm9rIiwiRXJyb3IiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiY29udGVudFR5cGUiLCJnZXQiLCJpbmNsdWRlcyIsInRleHQiLCJjbGVhclRpbWVvdXQiLCJwYXJzZUh0bWwiLCJodG1sIiwiYmFzZVVybCIsIiQiLCJsb2FkIiwicGFyc2VkQmFzZSIsInBhZ2VUaXRsZSIsImZpcnN0IiwibWV0YURlc2NyaXB0aW9uIiwiYXR0ciIsImNhbm9uaWNhbFVybCIsIm9nVGl0bGUiLCJvZ0Rlc2NyaXB0aW9uIiwidHdpdHRlclRpdGxlIiwidHdpdHRlckRlc2NyaXB0aW9uIiwiaDFUYWdzIiwiZWFjaCIsIl8iLCJlbCIsInB1c2giLCJoMlRhZ3MiLCJqc29uTGRCbG9ja3MiLCJzY2hlbWFUeXBlcyIsIkpTT04iLCJwYXJzZSIsInR5cGVzIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsIml0ZW0iLCJ0IiwiaW1hZ2VzIiwiaW1hZ2VDb3VudCIsImxlbmd0aCIsImltYWdlc01pc3NpbmdBbHQiLCJhbHQiLCJpbnRlcm5hbExpbmtzIiwiZXh0ZXJuYWxMaW5rcyIsImhyZWYiLCJyZXNvbHZlZCIsImhvc3RuYW1lIiwicmVtb3ZlIiwicmF3VGV4dCIsInJlcGxhY2UiLCJib2R5VGV4dCIsInNsaWNlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/scrape.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fanalyze%2Froute&page=%2Fapi%2Fanalyze%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fanalyze%2Froute.ts&appDir=D%3A%5CAnswerRank%20Scanner%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CAnswerRank%20Scanner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fanalyze%2Froute&page=%2Fapi%2Fanalyze%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fanalyze%2Froute.ts&appDir=D%3A%5CAnswerRank%20Scanner%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CAnswerRank%20Scanner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var D_AnswerRank_Scanner_app_api_analyze_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/analyze/route.ts */ \"(rsc)/./app/api/analyze/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/analyze/route\",\n        pathname: \"/api/analyze\",\n        filename: \"route\",\n        bundlePath: \"app/api/analyze/route\"\n    },\n    resolvedPagePath: \"D:\\\\AnswerRank Scanner\\\\app\\\\api\\\\analyze\\\\route.ts\",\n    nextConfigOutput,\n    userland: D_AnswerRank_Scanner_app_api_analyze_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZhbmFseXplJTJGcm91dGUmcGFnZT0lMkZhcGklMkZhbmFseXplJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGYW5hbHl6ZSUyRnJvdXRlLnRzJmFwcERpcj1EJTNBJTVDQW5zd2VyUmFuayUyMFNjYW5uZXIlNUNhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPUQlM0ElNUNBbnN3ZXJSYW5rJTIwU2Nhbm5lciZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDRztBQUNoRjtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiRDpcXFxcQW5zd2VyUmFuayBTY2FubmVyXFxcXGFwcFxcXFxhcGlcXFxcYW5hbHl6ZVxcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvYW5hbHl6ZS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2FuYWx5emVcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2FuYWx5emUvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJEOlxcXFxBbnN3ZXJSYW5rIFNjYW5uZXJcXFxcYXBwXFxcXGFwaVxcXFxhbmFseXplXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fanalyze%2Froute&page=%2Fapi%2Fanalyze%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fanalyze%2Froute.ts&appDir=D%3A%5CAnswerRank%20Scanner%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CAnswerRank%20Scanner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "?32c4":
/*!****************************!*\
  !*** bufferutil (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?66e9":
/*!********************************!*\
  !*** utf-8-validate (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "node:assert":
/*!******************************!*\
  !*** external "node:assert" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:assert");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:async_hooks");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:console":
/*!*******************************!*\
  !*** external "node:console" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:console");

/***/ }),

/***/ "node:crypto":
/*!******************************!*\
  !*** external "node:crypto" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ "node:diagnostics_channel":
/*!*******************************************!*\
  !*** external "node:diagnostics_channel" ***!
  \*******************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ "node:dns":
/*!***************************!*\
  !*** external "node:dns" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:dns");

/***/ }),

/***/ "node:events":
/*!******************************!*\
  !*** external "node:events" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:fs/promises":
/*!***********************************!*\
  !*** external "node:fs/promises" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs/promises");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:http2":
/*!*****************************!*\
  !*** external "node:http2" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http2");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ "node:net":
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:perf_hooks":
/*!**********************************!*\
  !*** external "node:perf_hooks" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:perf_hooks");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:querystring":
/*!***********************************!*\
  !*** external "node:querystring" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:querystring");

/***/ }),

/***/ "node:sqlite":
/*!******************************!*\
  !*** external "node:sqlite" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:sqlite");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/promises":
/*!***************************************!*\
  !*** external "node:stream/promises" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/promises");

/***/ }),

/***/ "node:stream/web":
/*!**********************************!*\
  !*** external "node:stream/web" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/web");

/***/ }),

/***/ "node:timers":
/*!******************************!*\
  !*** external "node:timers" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:timers");

/***/ }),

/***/ "node:tls":
/*!***************************!*\
  !*** external "node:tls" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:util/types":
/*!**********************************!*\
  !*** external "node:util/types" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util/types");

/***/ }),

/***/ "node:worker_threads":
/*!**************************************!*\
  !*** external "node:worker_threads" ***!
  \**************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:worker_threads");

/***/ }),

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "string_decoder":
/*!*********************************!*\
  !*** external "string_decoder" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/gaxios","vendor-chunks/formdata-node","vendor-chunks/undici","vendor-chunks/openai","vendor-chunks/google-auth-library","vendor-chunks/iconv-lite","vendor-chunks/parse5","vendor-chunks/cheerio","vendor-chunks/ws","vendor-chunks/form-data-encoder","vendor-chunks/css-select","vendor-chunks/htmlparser2","vendor-chunks/entities","vendor-chunks/domutils","vendor-chunks/whatwg-url","vendor-chunks/whatwg-mimetype","vendor-chunks/jws","vendor-chunks/agentkeepalive","vendor-chunks/nth-check","vendor-chunks/cheerio-select","vendor-chunks/whatwg-encoding","vendor-chunks/retry","vendor-chunks/json-bigint","vendor-chunks/google-logging-utils","vendor-chunks/encoding-sniffer","vendor-chunks/domhandler","vendor-chunks/dom-serializer","vendor-chunks/gcp-metadata","vendor-chunks/tr46","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/css-what","vendor-chunks/web-streams-polyfill","vendor-chunks/parse5-parser-stream","vendor-chunks/parse5-htmlparser2-tree-adapter","vendor-chunks/node-fetch","vendor-chunks/domelementtype","vendor-chunks/@google","vendor-chunks/webidl-conversions","vendor-chunks/safer-buffer","vendor-chunks/safe-buffer","vendor-chunks/p-retry","vendor-chunks/ms","vendor-chunks/jwa","vendor-chunks/humanize-ms","vendor-chunks/extend","vendor-chunks/event-target-shim","vendor-chunks/buffer-equal-constant-time","vendor-chunks/boolbase","vendor-chunks/bignumber.js","vendor-chunks/base64-js","vendor-chunks/abort-controller"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fanalyze%2Froute&page=%2Fapi%2Fanalyze%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fanalyze%2Froute.ts&appDir=D%3A%5CAnswerRank%20Scanner%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CAnswerRank%20Scanner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();