import { errorResponse, jsonResponse, preflight } from "../_shared/http.ts";

const FEED_TIMEOUT_MS = 5000;
const MAX_FEED_CHARS = 2_000_000;
// The endpoint is public (no JWT): results are shared by every caller for
// 10 minutes so a request never costs more than the cache lookup.
const CACHE_TTL_MS = 10 * 60 * 1000;

// RSS dates are free text: anything unparsable is dropped rather than sent
// to clients that call new Date(...).toISOString() on it.
function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const time = Date.parse(value.trim());
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

// Rendered as <a href> / <img src> by the client: anything that is not a
// plain http(s) URL (javascript:, data:, ...) is dropped.
function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

interface RSSFeed {
  source: string;
  url: string;
}

const RSS_FEEDS: RSSFeed[] = [
  {
    source: 'Sherdog',
    url: 'https://www.sherdog.com/rss/news.xml'
  },
  {
    source: 'MMA Fighting',
    url: 'https://www.mmafighting.com/rss/index.xml'
  },
  {
    source: 'Bloody Elbow',
    url: 'https://www.bloodyelbow.com/rss/index.xml'
  }
];

interface FightResult {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string;
}

// Parse un bloc <item> RSS en FightResult, ou null si titre/lien manquants.
function parseRssItem(itemContent: string, source: string): FightResult | null {
  const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
  const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
  const link = safeHttpUrl(linkMatch?.[1]);
  if (!titleMatch || !link) return null;

  const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);
  const pubDate = isoDate(pubDateMatch?.[1]);
  if (!pubDate) return null;
  const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/.exec(itemContent);
  const imageMatch = /<media:thumbnail url="(.*?)"|<enclosure url="(.*?)"/.exec(itemContent);

  return {
    title: titleMatch[1] || titleMatch[2] || '',
    link,
    pubDate,
    description: (descMatch ? (descMatch[1] || descMatch[2]) : '').substring(0, 200),
    source,
    imageUrl: safeHttpUrl(imageMatch ? (imageMatch[1] || imageMatch[2]) : undefined),
  };
}

async function fetchAndParseRSS(feed: RSSFeed): Promise<FightResult[]> {
  try {
    const response = await fetch(feed.url, { signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xmlText = (await response.text()).slice(0, MAX_FEED_CHARS);

    // Parse XML manually (simple parser)
    const items: FightResult[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const item = parseRssItem(match[1], feed.source);
      if (item) items.push(item);

      // Limit to 5 items per feed
      if (items.length >= 5) break;
    }

    return items;
  } catch (error) {
    console.error(`Error fetching RSS from ${feed.source}:`, error);
    return [];
  }
}

let cache: { at: number; results: FightResult[] } | null = null;
let inFlight: Promise<FightResult[]> | null = null;

async function loadResults(): Promise<FightResult[]> {
  const allResults = await Promise.all(RSS_FEEDS.map(feed => fetchAndParseRSS(feed)));
  return allResults
    .flat()
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, 20);
}

async function cachedResults(): Promise<FightResult[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.results;
  inFlight ??= loadResults()
    .then((results) => {
      // An outage of every feed must not pin an empty list for 10 minutes.
      if (results.length > 0) cache = { at: Date.now(), results };
      return results.length > 0 ? results : cache?.results ?? [];
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const combinedResults = await cachedResults();

    return jsonResponse(req, { results: combinedResults }, 200, {
      'Cache-Control': 'public, max-age=600',
    });
  } catch (error) {
    return errorResponse(req, error, 'fetch-mma-results');
  }
});
