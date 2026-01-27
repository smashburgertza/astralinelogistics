

# Fix noon.com Product Fetching with Firecrawl Fallback

## Problem

The `fetch-product-info` edge function fails when fetching from noon.com because:
- noon.com has strong anti-bot protection
- The site blocks direct HTTP requests from server environments
- HTTP/2 stream errors occur when the request is rejected

Error message:
```
http2 error: stream error received: unexpected internal error encountered
```

## Solution

Implement a two-tier fetching strategy:
1. **Primary**: Try direct fetch (works for most sites)
2. **Fallback**: Use Firecrawl API (for protected sites like noon.com)

Firecrawl is a professional web scraping service that handles JavaScript rendering and anti-bot bypass. It's available as a connector in the workspace.

---

## Implementation Steps

### Step 1: Connect Firecrawl

Link the Firecrawl connector to your project. This will make `FIRECRAWL_API_KEY` available as an environment variable in edge functions.

### Step 2: Update Edge Function with Retry and Fallback Logic

**File:** `supabase/functions/fetch-product-info/index.ts`

Add retry logic and Firecrawl fallback:

```typescript
// Retry-enabled fetch with multiple user agents
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response | null> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  ];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgents[attempt % userAgents.length],
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (response.ok) return response;
    } catch (error) {
      console.log(`Direct fetch attempt ${attempt + 1} failed:`, error.message);
    }
  }
  return null;
}

// Firecrawl fallback for difficult sites
async function fetchWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('Firecrawl API key not configured, skipping fallback');
    return null;
  }
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: false,
      }),
    });
    
    if (!response.ok) {
      console.log('Firecrawl request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data?.html || data.html || null;
  } catch (error) {
    console.error('Firecrawl error:', error);
    return null;
  }
}
```

Update the main fetch logic to use both strategies:

```typescript
// Primary: Try direct fetch
let html: string | null = null;
const pageResponse = await fetchWithRetry(url);

if (pageResponse) {
  html = await pageResponse.text();
  console.log('Direct fetch successful');
} else {
  // Fallback: Use Firecrawl for difficult sites
  console.log('Direct fetch failed, trying Firecrawl fallback...');
  html = await fetchWithFirecrawl(url);
  
  if (html) {
    console.log('Firecrawl fetch successful');
  }
}

// If both methods fail, return error
if (!html) {
  console.error('All fetch methods failed for:', url);
  return new Response(JSON.stringify({ 
    error: 'Failed to fetch the webpage. The site may be blocking automated requests.',
    product_name: null,
    product_price: null,
    currency: 'AED', // Detected from noon.com
    estimated_weight_kg: 1,
    origin_region: 'dubai'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Step 3: Add noon.com-Specific Extraction

Since noon.com is a common UAE shopping site, add specific extraction patterns:

```typescript
// Noon.com-specific extraction
const isNoon = urlLower.includes('noon.com');
if (isNoon) {
  console.log('Applying noon.com-specific extraction...');
  
  const noonPricePatterns = [
    /"price":\s*"?([\d.]+)"?/,
    /"salePrice":\s*"?([\d.]+)"?/,
    /"now":\s*([\d.]+)/,
    /class="[^"]*priceNow[^"]*"[^>]*>([\d.]+)/i,
  ];
  
  for (const pattern of noonPricePatterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (price > 0) {
        extractedPrice = price;
        extractedCurrency = 'AED';
        console.log('Found noon.com price:', price, 'AED');
        break;
      }
    }
  }
}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| Connector setup | Link Firecrawl connector to project |
| `supabase/functions/fetch-product-info/index.ts` | Add `fetchWithRetry()`, `fetchWithFirecrawl()` functions, noon.com extraction patterns |

---

## How It Will Work

```text
User submits noon.com URL
         |
         v
+-------------------+
| Direct Fetch      |  Try direct HTTP request with retry
| (2 attempts)      |
+-------------------+
         |
    FAILS (HTTP/2 error)
         |
         v
+-------------------+
| Firecrawl API     |  Use professional scraper as fallback
| (Handles anti-bot)|
+-------------------+
         |
    SUCCESS
         |
         v
+-------------------+
| Extract product   |  Use noon.com-specific patterns
| info from HTML    |  + AI analysis
+-------------------+
         |
         v
  Return product data with
  AED currency (Dubai region)
```

---

## Expected Result

After implementation, noon.com products will be fetched successfully:

| Field | Value |
|-------|-------|
| Product Name | 20 Pcs Car Wheel Tire Brush Set... |
| Price | ~AED XX.XX |
| Currency | AED |
| Region | Dubai |
| Category | General Goods |

