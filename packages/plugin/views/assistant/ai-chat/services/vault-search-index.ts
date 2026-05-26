import { App, TFile } from "obsidian";

export interface VaultSearchResult {
  title: string;
  contentPreview: string;
  contentLength: number;
  wordCount: number;
  path: string;
  modified: number;
}

interface IndexedFile {
  path: string;
  title: string;
  mtime: number;
  size: number;
  contentLength: number;
  wordCount: number;
  preview: string;
  lowerContent: string;
}

const PREVIEW_LENGTH = 500;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termsFromQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function previewAroundMatch(content: string, terms: string[]): string {
  const lower = content.toLowerCase();
  const firstMatch = terms
    .map(term => lower.indexOf(term))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstMatch === undefined) {
    return content.slice(0, PREVIEW_LENGTH);
  }

  const start = Math.max(0, firstMatch - Math.floor(PREVIEW_LENGTH / 3));
  const preview = content.slice(start, start + PREVIEW_LENGTH);
  return `${start > 0 ? "..." : ""}${preview}${
    start + PREVIEW_LENGTH < content.length ? "..." : ""
  }`;
}

export class VaultSearchIndex {
  private indexed = new Map<string, IndexedFile>();

  constructor(private readonly app: App) {}

  public async search(query: string, maxResults = 10): Promise<VaultSearchResult[]> {
    const terms = termsFromQuery(query);
    if (terms.length === 0) {
      return [];
    }

    await this.refresh();

    const termRegexes = terms.map(
      term => new RegExp(`(^|\\W)${escapeRegExp(term)}(\\W|$)`, "i")
    );

    return Array.from(this.indexed.values())
      .filter(file => termRegexes.every(regex => regex.test(file.lowerContent)))
      .slice(0, maxResults)
      .map(file => ({
        title: file.title,
        contentPreview: previewAroundMatch(file.lowerContent, terms),
        contentLength: file.contentLength,
        wordCount: file.wordCount,
        path: file.path,
        modified: file.mtime,
      }));
  }

  private async refresh(): Promise<void> {
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const currentPaths = new Set(markdownFiles.map(file => file.path));

    for (const path of Array.from(this.indexed.keys())) {
      if (!currentPaths.has(path)) {
        this.indexed.delete(path);
      }
    }

    await Promise.all(
      markdownFiles.map(async file => {
        const existing = this.indexed.get(file.path);
        if (
          existing &&
          existing.mtime === file.stat.mtime &&
          existing.size === file.stat.size
        ) {
          return;
        }
        this.indexed.set(file.path, await this.indexFile(file));
      })
    );
  }

  private async indexFile(file: TFile): Promise<IndexedFile> {
    const content = await this.app.vault.cachedRead(file);
    return {
      path: file.path,
      title: file.basename,
      mtime: file.stat.mtime,
      size: file.stat.size,
      contentLength: content.length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      preview: content.slice(0, PREVIEW_LENGTH),
      lowerContent: content.toLowerCase(),
    };
  }
}

const indexes = new WeakMap<App, VaultSearchIndex>();

export function getVaultSearchIndex(app: App): VaultSearchIndex {
  let index = indexes.get(app);
  if (!index) {
    index = new VaultSearchIndex(app);
    indexes.set(app, index);
  }
  return index;
}
