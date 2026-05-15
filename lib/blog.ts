import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  title: string;
  date: string;
  slug: string;
  description: string;
  tags: string[];
  coverImage?: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

function ensureString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function ensureDateString(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return ensureString(value);
}

function ensureTags(value: unknown) {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

function readPostFile(fileName: string): BlogPost {
  const filePath = path.join(BLOG_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const slug = ensureString(parsed.data.slug) || fileName.replace(/\.mdx$/, "");

  return {
    title: ensureString(parsed.data.title),
    date: ensureDateString(parsed.data.date),
    slug,
    description: ensureString(parsed.data.description),
    tags: ensureTags(parsed.data.tags),
    coverImage: ensureString(parsed.data.coverImage) || undefined,
    content: parsed.content,
  };
}

export function getAllBlogPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map(readPostFile)
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPost(slug: string): BlogPost | null {
  if (!fs.existsSync(BLOG_DIR)) return null;

  const fileName = fs
    .readdirSync(BLOG_DIR)
    .find((name) => name.endsWith(".mdx") && readPostFile(name).slug === slug);

  return fileName ? readPostFile(fileName) : null;
}
