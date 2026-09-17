import { config } from './config';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (!config.searxngUrl) return [];

  const url = new URL('/search', config.searxngUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SearXNG tra ve loi ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title: string; url: string; content?: string }>;
  };

  return (data.results ?? []).slice(0, 5).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content ?? '',
  }));
}
