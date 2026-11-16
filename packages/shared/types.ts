export interface Source {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}
export interface Article {
  id: string;
  sourceId: string;
  title: string;
  excerpt: string;
  theme: string;
  subject: string;
  publishedAt: string;
  readingMinutes: number;
  body: string[];
}
export type WorkspaceSection = "edition" | "sources" | "settings";

export interface TrialSource {
  id: string;
  name: string;
  url: string;
  category: string;
  feed: string | null;
  enabled: boolean;
  status: string;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  nextFetchAt: number;
  articleCount: number;
}
export interface TrialArticle {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  collectedAt: string;
}
export interface TrialWorkspace {
  sources: TrialSource[];
  articles: TrialArticle[];
}
