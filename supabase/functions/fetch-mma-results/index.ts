import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function fetchAndParseRSS(feed: RSSFeed): Promise<FightResult[]> {
  try {
    const response = await fetch(feed.url);
    const xmlText = await response.text();
    
    // Parse XML manually (simple parser)
    const items: FightResult[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = xmlText.matchAll(itemRegex);
    
    for (const match of matches) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      const imageMatch = itemContent.match(/<media:thumbnail url="(.*?)"|<enclosure url="(.*?)"/);
      
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1] || titleMatch[2] || '',
          link: linkMatch[1] || '',
          pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
          description: (descMatch ? (descMatch[1] || descMatch[2]) : '').substring(0, 200),
          source: feed.source,
          imageUrl: imageMatch ? (imageMatch[1] || imageMatch[2]) : undefined
        });
      }
      
      // Limit to 5 items per feed
      if (items.length >= 5) break;
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching RSS from ${feed.source}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching MMA results from RSS feeds...');
    
    // Fetch all RSS feeds in parallel
    const allResults = await Promise.all(
      RSS_FEEDS.map(feed => fetchAndParseRSS(feed))
    );
    
    // Flatten and sort by date
    const combinedResults = allResults
      .flat()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 20); // Return top 20 most recent
    
    console.log(`Successfully fetched ${combinedResults.length} results`);
    
    return new Response(
      JSON.stringify({ results: combinedResults }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-mma-results:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
