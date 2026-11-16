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
export type FullTextStatus =
  "pending" | "available" | "live" | "restricted" | "unavailable";

export interface TrialArticle {
  fullTextStatus?: FullTextStatus;
  theme: string;
  subtheme: string | null;
  imageUrl: string | null;
  imageCredit: string;
  accessLevel: "free" | "restricted" | "unknown";
  publisherCategories: string[];
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

export interface TrialArticleDetail extends TrialArticle {
  bodyText: string;
  contentKind?: "feed" | "article";
  fullTextReason?: string;
  fullTextFetchedAt?: number | null;
  fullTextNextAttemptAt?: number;
}
