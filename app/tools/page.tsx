import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Bot, Building2, Newspaper, Code2, FileSearch, FileText, ListChecks, Map, ShieldCheck, Tags } from "lucide-react";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Free AEO Tools | AEOCheck",
  description:
    "Free tools for AI search visibility: generate llms.txt and robots.txt files, check which AI crawlers you allow, build Organization and FAQ schema, check your markup and test how quotable your content is. No signup needed.",
  path: "/tools",
});

const TOOLS = [
  {
    href: "/tools/ai-crawler-checker",
    icon: Bot,
    name: "AI Crawler Checker",
    text: "See whether GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended can read your site.",
  },
  {
    href: "/tools/llms-txt-generator",
    icon: FileText,
    name: "llms.txt Generator",
    text: "Build a ready-to-publish llms.txt from your homepage and key pages.",
  },
  {
    href: "/tools/content-extractability",
    icon: FileSearch,
    name: "Content Extractability Checker",
    text: "Test whether each section of a page opens with a passage AI engines can quote on its own.",
  },
  {
    href: "/tools/schema-checker",
    icon: Code2,
    name: "Schema Markup Checker",
    text: "Inspect a page's JSON-LD: which types it has, which required properties are missing.",
  },
  {
    href: "/tools/meta-tag-checker",
    icon: Tags,
    name: "Meta Tag Checker",
    text: "Check title, description, canonical and social tags with live search and social previews.",
  },
  {
    href: "/tools/sitemap-checker",
    icon: Map,
    name: "Sitemap Checker",
    text: "Validate sitemap.xml: URLs, lastmod dates, duplicates, broken links and the robots.txt reference.",
  },
  {
    href: "/tools/robots-txt-generator",
    icon: ShieldCheck,
    name: "robots.txt Generator",
    text: "Set a policy for GPTBot, OAI-SearchBot, PerplexityBot and ClaudeBot and copy the file.",
  },
  {
    href: "/tools/ai-readiness-badge",
    icon: BadgeCheck,
    name: "AI Readiness Badge",
    text: "Embed your AI readiness score on your site or README. Updates daily.",
  },
  {
    href: "/tools/article-schema-generator",
    icon: Newspaper,
    name: "Article Schema Generator",
    text: "Generate Article or BlogPosting JSON-LD with author, dates, image and publisher.",
  },
  {
    href: "/tools/organization-schema-generator",
    icon: Building2,
    name: "Organization Schema Generator",
    text: "Generate Organization and WebSite JSON-LD with your logo and profile links.",
  },
  {
    href: "/tools/faq-schema-generator",
    icon: ListChecks,
    name: "FAQ Schema Generator",
    text: "Turn questions and answers into valid FAQPage JSON-LD, right in your browser.",
  },
];

export default function ToolsIndexPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tools</p>
            <h1>Free AEO Tools</h1>
            <p>Small, focused tools that fix one technical AI-search problem each. No signup required.</p>
          </div>
          <div className="tools-grid">
            {TOOLS.map(({ href, icon: Icon, name, text }) => (
              <Link key={href} href={href} className="surface tools-card">
                <Icon className="h-6 w-6" aria-hidden="true" />
                <h2>{name}</h2>
                <p>{text}</p>
              </Link>
            ))}
          </div>
          <p className="tools-note">
            Want the full picture? <Link href="/#scanner">Run a free AEO scan</Link> to test 25 AI visibility signals on any page.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
