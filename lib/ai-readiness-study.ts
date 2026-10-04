import raw from "@/data/ai-readiness-study.json";

export type StudySite = {
  domain: string;
  category: string;
  robotsReachable: boolean;
  blocked: string[];
  blocksSearchCrawler: boolean;
  blocksGptbot: boolean;
  blocksAnyAi: boolean;
  llmsTxt: boolean;
  homeReachable: boolean;
  jsonLd: boolean;
  organizationSchema: boolean;
  faqSchema: boolean;
};

export type StudyStats = {
  total: number;
  robotsChecked: number;
  homepagesChecked: number;
  blocksSearchCrawler: number;
  blocksGptbot: number;
  blocksAnyAi: number;
  llmsTxt: number;
  jsonLd: number;
  organizationSchema: number;
  faqSchema: number;
};

export const STUDY_DATE: string = raw.collectedAt;
export const STUDY_SITES = raw.results as StudySite[];

const count = (sites: StudySite[], pick: (s: StudySite) => boolean) => sites.filter(pick).length;

/** Robots-based numbers use only sites whose robots.txt we could read; schema numbers only sites whose homepage loaded. */
export function computeStats(sites: StudySite[]): StudyStats {
  const robots = sites.filter((s) => s.robotsReachable);
  const homes = sites.filter((s) => s.homeReachable);
  return {
    total: sites.length,
    robotsChecked: robots.length,
    homepagesChecked: homes.length,
    blocksSearchCrawler: count(robots, (s) => s.blocksSearchCrawler),
    blocksGptbot: count(robots, (s) => s.blocksGptbot),
    blocksAnyAi: count(robots, (s) => s.blocksAnyAi),
    llmsTxt: count(sites, (s) => s.llmsTxt),
    jsonLd: count(homes, (s) => s.jsonLd),
    organizationSchema: count(homes, (s) => s.organizationSchema),
    faqSchema: count(homes, (s) => s.faqSchema),
  };
}

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
