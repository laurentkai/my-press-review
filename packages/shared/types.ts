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
