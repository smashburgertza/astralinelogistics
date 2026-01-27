import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for word boundary matching - prevents partial word matches
function matchesKeyword(text: string, keyword: string): boolean {
  // Escape special regex characters in keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match word boundaries - allows plurals (laptops matches laptop)
  const regex = new RegExp(`\\b${escapedKeyword}s?\\b`, 'i');
  return regex.test(text);
}

// Car care/cleaning product exclusions - these should NOT be classified as spare_parts
const carCareExclusions = [
  'brush', 'cleaner', 'cleaning', 'wash', 'wax', 'polish', 
  'detailing', 'mitt', 'towel', 'microfiber', 'sponge', 'shampoo',
  'vacuum', 'duster', 'organizer', 'mat', 'cover', 'seat cover',
  'air freshener', 'protectant', 'kit set', 'accessory'
];

// Retry-enabled fetch with multiple user agents
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response | null> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  ];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Direct fetch attempt ${attempt + 1}...`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgents[attempt % userAgents.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (response.ok) {
        console.log(`Direct fetch successful on attempt ${attempt + 1}`);
        return response;
      }
      console.log(`Direct fetch attempt ${attempt + 1} returned status:`, response.status);
    } catch (error) {
      console.log(`Direct fetch attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  return null;
}

// Firecrawl fallback for difficult sites like noon.com
async function fetchWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('Firecrawl API key not configured, skipping fallback');
    return null;
  }
  
  try {
    console.log('Attempting Firecrawl fallback for:', url);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html'],
        onlyMainContent: false,
      }),
    });
    
    if (!response.ok) {
      console.log('Firecrawl request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const html = data.data?.html || data.html || null;
    if (html) {
      console.log('Firecrawl fetch successful, got HTML length:', html.length);
    }
    return html;
  } catch (error) {
    console.error('Firecrawl error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Enhanced hazardous goods detection patterns with exclusions
interface HazardousPattern {
  keywords: string[];
  excludePatterns: string[];
  category: 'battery' | 'flammable' | 'pressurized' | 'chemical' | 'fragrance';
  severity: 'restricted' | 'special_handling' | 'prohibited';
}

const HAZARDOUS_PATTERNS: HazardousPattern[] = [
  {
    keywords: ['lithium battery', 'lithium-ion', 'li-ion', 'lipo', 'lithium polymer'],
    excludePatterns: ['charger only', 'battery charger', 'replacement charger', 'charger for'],
    category: 'battery',
    severity: 'restricted'
  },
  {
    keywords: ['battery', 'batteries'],
    excludePatterns: [
      'battery-operated', 'battery powered', 'battery-powered', 'uses batteries', 
      'batteries included', 'batteries not included', 'charger', 'battery case', 
      'battery holder', 'battery cover', 'battery door', 'battery compartment',
      'remote control', 'rc car', 'rc drone', 'toy', 'kids', 'children', 'game'
    ],
    category: 'battery',
    severity: 'special_handling'
  },
  {
    keywords: ['perfume', 'cologne', 'eau de parfum', 'eau de toilette', 'fragrance spray', 'body spray', 'body mist'],
    excludePatterns: ['fragrance-free', 'unscented', 'perfume bottle empty', 'atomizer only', 'empty bottle'],
    category: 'fragrance',
    severity: 'restricted'
  },
  {
    keywords: ['aerosol', 'spray can', 'compressed gas', 'pressurized'],
    excludePatterns: ['non-aerosol', 'pump spray', 'trigger spray', 'mist spray', 'spray bottle'],
    category: 'pressurized',
    severity: 'restricted'
  },
  {
    keywords: ['nail polish', 'nail lacquer', 'nail varnish', 'gel polish'],
    excludePatterns: [
      'nail polish remover pads', 'nail stickers', 'press-on nails', 
      'nail tips', 'nail art', 'nail file', 'nail brush', 'nail clipper'
    ],
    category: 'flammable',
    severity: 'special_handling'
  },
  {
    keywords: ['paint', 'solvent', 'thinner', 'acetone', 'turpentine', 'lacquer'],
    excludePatterns: [
      'paint brush', 'paint roller', 'paint tray', 'dried paint', 
      'paint sample', 'color sample', 'paint chip', 'paint bucket empty',
      'acrylic paint tubes', 'watercolor', 'oil paint tubes'
    ],
    category: 'chemical',
    severity: 'restricted'
  },
  {
    keywords: ['alcohol', 'ethanol', 'isopropyl', 'rubbing alcohol'],
    excludePatterns: ['alcohol-free', 'non-alcoholic', 'zero alcohol', '0% alcohol', 'alcohol free'],
    category: 'flammable',
    severity: 'special_handling'
  },
  {
    keywords: ['fuel', 'gasoline', 'petrol', 'kerosene', 'propane', 'butane'],
    excludePatterns: [
      'fuel pump', 'fuel filter', 'fuel line', 'fuel tank empty', 
      'fuel gauge', 'fuel efficient', 'fuel cap', 'fuel injector'
    ],
    category: 'flammable',
    severity: 'prohibited'
  }
];

interface HazardousResult {
  isHazardous: boolean;
  category: 'battery' | 'flammable' | 'pressurized' | 'chemical' | 'fragrance' | null;
  severity: 'restricted' | 'special_handling' | 'prohibited' | null;
  matchedKeyword: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

function detectHazardousGoods(
  productName: string, 
  productDescription: string | null,
  url: string
): HazardousResult {
  const textToAnalyze = `${productName} ${productDescription || ''} ${url}`.toLowerCase();
  
  for (const pattern of HAZARDOUS_PATTERNS) {
    // Check if any keyword matches
    const matchedKeyword = pattern.keywords.find(k => textToAnalyze.includes(k));
    
    if (matchedKeyword) {
      // Check if any exclusion pattern is present
      const hasExclusion = pattern.excludePatterns.some(ex => textToAnalyze.includes(ex));
      
      if (!hasExclusion) {
        return {
          isHazardous: true,
          category: pattern.category,
          severity: pattern.severity,
          matchedKeyword,
          confidence: pattern.keywords.length > 1 ? 'high' : 'medium',
          reason: `Contains "${matchedKeyword}" - classified as ${pattern.category}`
        };
      }
    }
  }
  
  return {
    isHazardous: false,
    category: null,
    severity: null,
    matchedKeyword: null,
    confidence: 'high',
    reason: 'No hazardous indicators found'
  };
}

function refineHazardousClassification(
  hazardResult: HazardousResult,
  weightKg: number,
  productName: string
): HazardousResult {
  const productNameLower = productName.toLowerCase();
  
  // Small battery products (< 0.5kg) are often battery-operated toys
  if (hazardResult.category === 'battery' && weightKg < 0.5) {
    const toyIndicators = ['toy', 'kids', 'children', 'game', 'remote control', 
                          'rc car', 'drone', 'robot', 'action figure', 'doll'];
    if (toyIndicators.some(t => productNameLower.includes(t))) {
      return {
        isHazardous: false,
        category: null,
        severity: null,
        matchedKeyword: null,
        confidence: 'medium',
        reason: 'Appears to be battery-operated toy, not standalone battery'
      };
    }
  }
  
  // Large battery products (> 5kg) like car batteries are definitely hazardous
  if (hazardResult.category === 'battery' && weightKg > 5) {
    return {
      isHazardous: true,
      category: 'battery',
      severity: 'restricted',
      matchedKeyword: hazardResult.matchedKeyword,
      confidence: 'high',
      reason: 'Large battery product requires special handling'
    };
  }
  
  return hazardResult;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching URL:', url);

    // Two-tier fetching strategy: Direct fetch with retry, then Firecrawl fallback
    let html: string | null = null;
    const pageResponse = await fetchWithRetry(url);

    if (pageResponse) {
      html = await pageResponse.text();
      console.log('Got HTML from direct fetch, length:', html.length);
    } else {
      // Fallback: Use Firecrawl for difficult sites (noon.com, etc.)
      console.log('Direct fetch failed, trying Firecrawl fallback...');
      html = await fetchWithFirecrawl(url);
    }

    // If both methods fail, return error
    if (!html) {
      console.error('All fetch methods failed for:', url);
      // Try to detect region from URL for better error response
      let fallbackCurrency = 'USD';
      let fallbackRegion = 'usa';
      if (url.toLowerCase().includes('noon.com') || url.toLowerCase().includes('.ae')) {
        fallbackCurrency = 'AED';
        fallbackRegion = 'dubai';
      }
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch the webpage. The site may be blocking automated requests.',
        product_name: null,
        product_price: null,
        currency: fallbackCurrency,
        estimated_weight_kg: 1,
        origin_region: fallbackRegion
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Detect the site for targeted extraction
    const urlLower = url.toLowerCase();
    const isEbay = urlLower.includes('ebay.');
    const isAmazon = urlLower.includes('amazon.');
    const isAliExpress = urlLower.includes('aliexpress.');
    const isNoon = urlLower.includes('noon.com');
    
    // Try to extract price from structured data first (JSON-LD, meta tags)
    let extractedPrice: number | null = null;
    let extractedCurrency = 'USD';
    let extractedImage: string | null = null;
    let extractedName: string | null = null;
    
    // Detect currency and origin region from URL domain
    let detectedRegion = 'usa'; // default
    if (urlLower.includes('.co.uk') || urlLower.includes('.uk')) {
      extractedCurrency = 'GBP';
      detectedRegion = 'uk';
    } else if (urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es') || urlLower.includes('.eu')) {
      extractedCurrency = 'EUR';
      detectedRegion = 'europe';
    } else if (urlLower.includes('.cn') || urlLower.includes('.com.cn') || isAliExpress || urlLower.includes('taobao') || urlLower.includes('1688.com') || urlLower.includes('jd.com')) {
      extractedCurrency = 'CNY';
      detectedRegion = 'china';
    } else if (urlLower.includes('.in') || urlLower.includes('.co.in') || urlLower.includes('flipkart') || urlLower.includes('myntra')) {
      extractedCurrency = 'INR';
      detectedRegion = 'india';
    } else if (urlLower.includes('.ae') || urlLower.includes('noon.com') || urlLower.includes('dubizzle')) {
      extractedCurrency = 'AED';
      detectedRegion = 'dubai';
    } else if (urlLower.includes('.com') && !urlLower.includes('.co.')) {
      extractedCurrency = 'USD';
      detectedRegion = 'usa';
    }
    
    // Detect product category from URL domain patterns (initial detection)
    type ProductCategory = 'general' | 'hazardous' | 'cosmetics' | 'electronics' | 'spare_parts';
    let detectedCategory: ProductCategory = 'general';
    
    // Cosmetics sites
    const cosmeticsSites = ['sephora', 'ulta', 'beautybay', 'cultbeauty', 'lookfantastic', 'dermstore', 'feelunique', 'spacenk', 'mecca', 'boots.com/beauty', 'superdrug', 'theordinary', 'glossier', 'fenty', 'nars', 'mac', 'clinique', 'loreal', 'maybelline', 'nyxcosmetics'];
    if (cosmeticsSites.some(site => urlLower.includes(site))) {
      detectedCategory = 'cosmetics';
    }
    
    // Electronics sites
    const electronicsSites = ['bestbuy', 'newegg', 'bhphoto', 'currys', 'adorama', 'microcenter', 'apple.com', 'samsung.com', 'dell.com', 'hp.com', 'lenovo.com', 'asus.com', 'radioshack', 'frys', 'tigerdirect', 'crutchfield'];
    if (electronicsSites.some(site => urlLower.includes(site))) {
      detectedCategory = 'electronics';
    }
    
    // Spare parts / automotive sites
    const sparePartsSites = ['autozone', 'rockauto', 'advanceautoparts', 'orielly', 'napa', 'pepboys', 'partsgeek', 'carid', 'carparts', 'autoparts', 'ebay.com/motors', 'amazon.com/automotive', 'summitracing', 'jcwhitney'];
    if (sparePartsSites.some(site => urlLower.includes(site)) || urlLower.includes('/automotive') || urlLower.includes('/car-parts') || urlLower.includes('/auto-parts')) {
      detectedCategory = 'spare_parts';
    }
    
    console.log('Detected region:', detectedRegion, 'currency:', extractedCurrency, 'initial category:', detectedCategory);
    
    // Look for JSON-LD structured data (most reliable)
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
            if (item.name && !extractedName) extractedName = item.name;
            if (item.image) {
              const imgData = Array.isArray(item.image) ? item.image[0] : item.image;
              if (typeof imgData === 'string') {
                extractedImage = imgData;
              } else if (imgData && typeof imgData === 'object' && 'url' in imgData) {
                extractedImage = imgData.url || null;
              }
            }
            const offers = item.offers || item.Offers;
            if (offers) {
              const offer = Array.isArray(offers) ? offers[0] : offers;
              if (offer.price) {
                extractedPrice = parseFloat(String(offer.price).replace(/[^0-9.]/g, ''));
                extractedCurrency = offer.priceCurrency || extractedCurrency;
                console.log('Found price in JSON-LD:', extractedPrice, extractedCurrency);
              }
            }
          }
        }
      } catch (e) {
        // JSON parsing failed, continue
      }
    }
    
    // SITE-SPECIFIC PRICE EXTRACTION
    
    // eBay-specific extraction
    if (!extractedPrice && isEbay) {
      console.log('Attempting eBay-specific price extraction...');
      
      const ebayPatterns = [
        /class="x-price-primary"[^>]*>[\s\S]*?<span[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /class="x-bin-price"[^>]*>[\s\S]*?<span[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /itemprop="price"[^>]*content="([\d.]+)"/i,
        /"binPrice":\s*"?([\d.]+)"?/i,
        /"price":\s*"?([\d.]+)"?/i,
        /data-testid="x-price-primary"[^>]*>[\s\S]*?([£$€]\s*[\d,]+\.?\d*)/i,
        /<span[^>]*class="[^"]*ux-textspans[^"]*"[^>]*>([£$€]\s*[\d,]+\.?\d*)<\/span>/i,
        /class="display-price"[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /"BIN_PRICE":"([£$€]?[\d,]+\.?\d*)"/i,
        /"convertedBinPrice":"([£$€]?[\d,]+\.?\d*)"/i,
        /"currentPrice":\s*\{[^}]*"value":\s*([\d.]+)/i,
        /name="binPriceDouble"[^>]*value="([\d.]+)"/i,
        />([£$€]\s*[\d,]+\.?\d*)<\/span>/g,
      ];
      
      for (const pattern of ebayPatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 1000000) {
            extractedPrice = price;
            console.log('Found eBay price:', extractedPrice, 'from pattern:', pattern.source.substring(0, 50));
            break;
          }
        }
      }
      
      if (html.includes('£') || urlLower.includes('.co.uk')) extractedCurrency = 'GBP';
      else if (html.includes('€')) extractedCurrency = 'EUR';
      else extractedCurrency = 'USD';
    }
    
    // Amazon-specific extraction
    if (!extractedPrice && isAmazon) {
      console.log('Attempting Amazon-specific price extraction...');
      
      const amazonPatterns = [
        /class="a-price-whole"[^>]*>([\d,]+)/i,
        /class="a-offscreen"[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /"priceAmount":\s*([\d.]+)/i,
        /id="priceblock_ourprice"[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /id="priceblock_dealprice"[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /data-a-color="price"[^>]*>[\s\S]*?([£$€]\s*[\d,]+\.?\d*)/i,
        /"buyingPrice":\s*([\d.]+)/i,
      ];
      
      for (const pattern of amazonPatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 1000000) {
            extractedPrice = price;
            console.log('Found Amazon price:', extractedPrice);
            break;
          }
        }
      }
    }
    
    // AliExpress-specific extraction
    if (!extractedPrice && isAliExpress) {
      console.log('Attempting AliExpress-specific price extraction...');
      
      const aliPatterns = [
        /"formatedActivityPrice":"([£$€]?\s*[\d,]+\.?\d*)"/i,
        /"formatedPrice":"([£$€]?\s*[\d,]+\.?\d*)"/i,
        /"minPrice":"([\d.]+)"/i,
        /class="product-price-value"[^>]*>([£$€]?\s*[\d,]+\.?\d*)/i,
      ];
      
      for (const pattern of aliPatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0) {
            extractedPrice = price;
            console.log('Found AliExpress price:', extractedPrice);
            break;
          }
        }
      }
    }
    
    // Noon.com-specific extraction
    if (!extractedPrice && isNoon) {
      console.log('Attempting noon.com-specific price extraction...');
      
      const noonPatterns = [
        /"price":\s*"?([\d.]+)"?/,
        /"salePrice":\s*"?([\d.]+)"?/,
        /"now":\s*([\d.]+)/,
        /"offer_price":\s*([\d.]+)/,
        /"special_price":\s*"?([\d.]+)"?/,
        /"final_price":\s*"?([\d.]+)"?/,
        /class="[^"]*priceNow[^"]*"[^>]*>[\s\S]*?([\d.]+)/i,
        /class="[^"]*price[^"]*"[^>]*>[\s]*AED[\s]*([\d,.]+)/i,
        /AED[\s]*([\d,.]+)/i,
        /data-price="([\d.]+)"/i,
      ];
      
      for (const pattern of noonPatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/,/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 1000000) {
            extractedPrice = price;
            extractedCurrency = 'AED';
            console.log('Found noon.com price:', extractedPrice, 'AED from pattern:', pattern.source.substring(0, 50));
            break;
          }
        }
      }
      
      // Also try to extract product name from noon.com specific patterns
      if (!extractedName) {
        const noonNamePatterns = [
          /"name":\s*"([^"]+)"/,
          /<h1[^>]*>([^<]+)<\/h1>/i,
          /<title>([^<|]+)/i,
        ];
        for (const pattern of noonNamePatterns) {
          const match = html.match(pattern);
          if (match && match[1].length > 5) {
            extractedName = match[1].trim();
            console.log('Found noon.com product name:', extractedName.substring(0, 50));
            break;
          }
        }
      }
    }
    
    // Look for Open Graph meta tags
    const ogPriceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:price:amount["']/i);
    const ogCurrencyMatch = html.match(/<meta[^>]*property=["']product:price:currency["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:price:currency["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    
    if (!extractedPrice && ogPriceMatch) {
      extractedPrice = parseFloat(ogPriceMatch[1].replace(/[^0-9.]/g, ''));
      if (ogCurrencyMatch) extractedCurrency = ogCurrencyMatch[1];
      console.log('Found price in OG tags:', extractedPrice, extractedCurrency);
    }
    if (!extractedImage && ogImageMatch) extractedImage = ogImageMatch[1];
    if (!extractedName && ogTitleMatch) extractedName = ogTitleMatch[1];
    
    // Look for common price patterns in meta/itemprop
    if (!extractedPrice) {
      const priceMetaMatch = html.match(/<[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/data-price=["']([0-9.]+)["']/i);
      const currencyMetaMatch = html.match(/<[^>]*itemprop=["']priceCurrency["'][^>]*content=["']([^"']+)["']/i);
      if (priceMetaMatch) {
        extractedPrice = parseFloat(priceMetaMatch[1].replace(/[^0-9.]/g, ''));
        if (currencyMetaMatch) extractedCurrency = currencyMetaMatch[1];
        console.log('Found price in itemprop/data:', extractedPrice, extractedCurrency);
      }
    }
    
    // GENERIC FALLBACK - look for common price patterns in HTML
    if (!extractedPrice) {
      console.log('Attempting generic price pattern extraction...');
      
      const genericPatterns = [
        /(?:price|cost|amount)[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        /class="[^"]*price[^"]*"[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        /id="[^"]*price[^"]*"[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        /data-price="([\d.]+)"/i,
        /data-product-price="([\d.]+)"/i,
      ];
      
      for (const pattern of genericPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 100000) {
            extractedPrice = price;
            console.log('Found generic price:', extractedPrice);
            break;
          }
        }
        if (extractedPrice) break;
      }
    }
    
    console.log('Pre-extracted data:', { extractedPrice, extractedCurrency, extractedImage, extractedName });
    
    // Truncate HTML to avoid token limits
    const truncatedHtml = html.substring(0, 30000);

    // Use Lovable AI to extract product info with detailed weight reasoning
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert product analyst specializing in e-commerce price extraction and logistics. Your PRIMARY task is to extract the PRODUCT PRICE, estimate shipping weight, and classify the product category.

## PRICE EXTRACTION - THIS IS CRITICAL

You MUST find the product price. Look for:

1. **eBay prices**: Look for patterns like:
   - "x-price-primary" class containing the price
   - "binPrice" or "BIN_PRICE" in scripts
   - "currentPrice" or "convertedPrice" 
   - Price displays near "Buy It Now" or "Buy it now"
   - Numbers with £, $, € symbols followed by amount

2. **Amazon prices**: Look for:
   - "a-price-whole" and "a-price-fraction" classes
   - "priceblock_ourprice" or "priceblock_dealprice"
   - "a-offscreen" spans with prices

3. **General patterns**:
   - JSON data with "price", "salePrice", "currentPrice", "amount"
   - Microdata with itemprop="price"
   - Meta tags with product:price:amount
   - Classes containing "price", "cost", "amount"
   - Currency symbols (£$€) followed by numbers

## WEIGHT ESTIMATION GUIDE

AUTOMOTIVE PARTS:
- Car engine (complete): 150-300 kg
- Engine block only: 50-150 kg
- Transmission: 40-80 kg
- Alternator: 5-10 kg
- Starter motor: 3-8 kg
- Radiator: 5-15 kg
- Car door: 20-40 kg
- Exhaust system: 15-30 kg
- Wheels/tires: 10-25 kg each
- Car seats: 15-30 kg each
- Bumper: 5-15 kg
- Car battery/leisure battery: 15-35 kg

ELECTRONICS:
- Smartphone: 0.2-0.3 kg
- Laptop: 1.5-3 kg
- TV 55": 15-20 kg
- Gaming console: 3-5 kg

CLOTHING:
- Shoes: 0.8-1.5 kg
- Jacket: 0.5-1.5 kg
- Jeans: 0.5-0.8 kg

## PRODUCT CATEGORY CLASSIFICATION

Classify this product into ONE of these categories:

1. **general** - Everyday cargo that doesn't fall into special regulatory classes
   - Clothing, household items, non-restricted consumer products
   - Requires standard documentation and handling
   - Examples: furniture, textiles, toys (without batteries), kitchenware

2. **hazardous** - Materials classified as dangerous under international transport rules
   - Flammable, toxic, corrosive, explosive substances
   - Requires special packaging, labeling, and safety compliance
   - Examples: standalone batteries, perfumes, aerosols, paints, solvents, fuel

3. **cosmetics** - Beauty and personal care products
   - Subject to health and safety regulations
   - Examples: creams, moisturizers, makeup, skincare, hair products
   - NOTE: Perfumes and aerosol sprays should be classified as HAZARDOUS instead

4. **electronics** - Consumer and industrial electronic devices or components
   - May involve restrictions on batteries (lithium)
   - Requires careful handling to avoid damage
   - Examples: phones, laptops, tablets, appliances, circuit boards, gaming consoles

5. **spare_parts** - Mechanical or automotive components for repairs/maintenance
   - Can include metals, plastics, or assemblies
   - Often bulky, subject to customs classification
   - Examples: engines, transmissions, brake pads, filters, radiators, alternators

## HAZARDOUS GOODS ANALYSIS

Analyze if this product requires special shipping handling. Consider:
- Standalone lithium batteries or power banks: HAZARDOUS
- Battery-operated toys or devices: NOT hazardous (batteries are incidental)
- Perfumes/colognes/fragrances: HAZARDOUS (flammable liquids)
- Aerosol sprays: HAZARDOUS (pressurized containers)
- Nail polish, paints, solvents: HAZARDOUS (flammable)
- Alcohol-based products (not alcohol-free): HAZARDOUS

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "product_name": "full product name",
  "product_description": "1-2 sentence description",
  "product_image": "main image URL or null",
  "product_price": number (WITHOUT currency symbol) or null,
  "currency": "GBP/USD/EUR/etc",
  "estimated_weight_kg": number (rounded UP, minimum 1),
  "weight_reasoning": "brief explanation",
  "product_category": "general|hazardous|cosmetics|electronics|spare_parts",
  "is_hazardous": true/false,
  "hazard_category": "battery|flammable|pressurized|chemical|fragrance|none",
  "hazard_reason": "brief explanation or null"
}

CRITICAL: 
- product_price MUST be a number, not a string
- Search the ENTIRE HTML for price data, including script tags and data attributes
- For eBay UK, prices are in GBP (£)
- For eBay US, prices are in USD ($)
- If you find ANY price mention, extract it`
          },
          {
            role: 'user',
            content: `EXTRACT THE PRICE from this product page. This is from ${isEbay ? 'eBay' : isAmazon ? 'Amazon' : 'an e-commerce site'}.

${extractedPrice ? `HINT: We may have found price ${extractedPrice} ${extractedCurrency} - verify this or find correct price.` : 'WARNING: We could not extract the price automatically. You MUST find it in the HTML.'}
${extractedName ? `Product: ${extractedName}` : ''}
${extractedImage ? `Image: ${extractedImage}` : ''}

Look carefully for price patterns like:
- "price": followed by number
- £ or $ or € followed by numbers  
- "BIN_PRICE", "binPrice", "currentPrice"
- class="price" or similar
- data-price attributes

URL: ${url}

HTML (search thoroughly for price):
${truncatedHtml}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to analyze product with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from AI response
    let productInfo;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productInfo = JSON.parse(jsonMatch[0]);
        
        // Ensure weight is rounded up to nearest whole number and minimum 1
        if (productInfo.estimated_weight_kg) {
          productInfo.estimated_weight_kg = Math.max(1, Math.ceil(productInfo.estimated_weight_kg));
        } else {
          productInfo.estimated_weight_kg = 1;
        }
        
        // Use pre-extracted data as fallback/override
        if (!productInfo.product_price && extractedPrice) {
          productInfo.product_price = extractedPrice;
          productInfo.currency = extractedCurrency;
          console.log('Using pre-extracted price:', extractedPrice);
        }
        if (!productInfo.product_image && extractedImage) {
          productInfo.product_image = extractedImage;
        }
        if (productInfo.product_name === 'Unknown Product' && extractedName) {
          productInfo.product_name = extractedName;
        }
        
        console.log('Weight reasoning:', productInfo.weight_reasoning);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      productInfo = {
        product_name: extractedName || 'Unknown Product',
        product_description: null,
        product_image: extractedImage,
        product_price: extractedPrice,
        currency: extractedCurrency,
        estimated_weight_kg: 1,
        weight_reasoning: 'Could not analyze product, using default weight',
        is_hazardous: false,
        hazard_category: 'none',
        hazard_reason: null
      };
    }

    // Apply multi-layer hazardous goods detection
    const productName = productInfo.product_name || '';
    const productDescription = productInfo.product_description || '';
    
    // Layer 1: Pattern-based detection with exclusions
    let hazardResult = detectHazardousGoods(productName, productDescription, url);
    
    // Layer 2: Refine based on weight (for battery products)
    if (hazardResult.isHazardous) {
      hazardResult = refineHazardousClassification(
        hazardResult,
        productInfo.estimated_weight_kg,
        productName
      );
    }
    
    // Layer 3: Consider AI analysis (if AI detected hazardous but we didn't, trust AI)
    if (!hazardResult.isHazardous && productInfo.is_hazardous === true) {
      hazardResult = {
        isHazardous: true,
        category: productInfo.hazard_category as HazardousResult['category'] || 'chemical',
        severity: 'special_handling',
        matchedKeyword: null,
        confidence: 'low',
        reason: productInfo.hazard_reason || 'AI detected potential hazard'
      };
    }
    
    console.log('Final hazard detection:', hazardResult);
    
    // Determine final category
    let finalCategory: ProductCategory = detectedCategory;
    const productNameLower = productName.toLowerCase();
    
    // Check if this is a car care/cleaning product (should be general, not spare_parts)
    const isCarCareProduct = carCareExclusions.some(ex => productNameLower.includes(ex));
    console.log('Car care product check:', isCarCareProduct, '| Product name:', productName.substring(0, 50));
    
    if (hazardResult.isHazardous) {
      finalCategory = 'hazardous';
    } else {
      // First check if AI suggested a category
      const aiCategory = productInfo.product_category;
      if (aiCategory && ['general', 'hazardous', 'cosmetics', 'electronics', 'spare_parts'].includes(aiCategory)) {
        finalCategory = aiCategory as ProductCategory;
        
        // CRITICAL FIX: Override AI's spare_parts or electronics classification for car care products
        // Car cleaning/detailing products should be "general" not "spare_parts" or "electronics"
        if ((finalCategory === 'spare_parts' || finalCategory === 'electronics') && isCarCareProduct) {
          console.log(`Overriding ${finalCategory} to general for car care product`);
          finalCategory = 'general';
        }
      }
      
      // Electronics keywords - use word boundary matching
      const electronicsProductKeywords = [
        'laptop', 'phone', 'smartphone', 'tablet', 'computer', 'pc',
        'monitor', 'tv', 'television', 'camera', 'headphone', 'earbuds',
        'speaker', 'console', 'playstation', 'xbox', 'nintendo', 'gpu', 
        'graphics card', 'processor', 'cpu', 'motherboard', 'ram',
        'ssd', 'hard drive', 'keyboard', 'mouse', 'router', 'modem',
        'smart watch', 'fitness tracker', 'drone', 'projector', 'printer'
      ];
      if (electronicsProductKeywords.some(k => matchesKeyword(productNameLower, k)) && finalCategory === 'general' && !isCarCareProduct) {
        finalCategory = 'electronics';
        console.log('Keyword override: electronics');
      }
      
      // Cosmetics keywords - use word boundary matching
      const cosmeticsProductKeywords = [
        'lipstick', 'mascara', 'foundation', 'eyeshadow', 'blush', 
        'concealer', 'moisturizer', 'serum', 'skincare', 'makeup', 
        'cosmetic', 'beauty', 'lotion', 'cream', 'cleanser', 'toner',
        'sunscreen', 'hair conditioner', 'shampoo', 'body lotion',
        'face mask', 'exfoliator', 'primer', 'bronzer', 'highlighter'
      ];
      if (cosmeticsProductKeywords.some(k => matchesKeyword(productNameLower, k)) && finalCategory === 'general') {
        finalCategory = 'cosmetics';
        console.log('Keyword override: cosmetics');
      }
      
      // Spare parts keywords - use specific multi-word phrases to avoid false positives
      const sparePartsProductKeywords = [
        'engine block', 'transmission', 'gearbox', 'brake pad', 'brake disc', 'brake rotor',
        'oil filter', 'air filter', 'fuel filter', 'radiator', 'alternator', 
        'starter motor', 'exhaust pipe', 'muffler', 'suspension spring', 'shock absorber',
        'carburetor', 'ignition coil', 'spark plug', 'clutch plate', 'gasket', 
        'wheel bearing', 'piston', 'crankshaft', 'camshaft', 'timing belt', 'timing chain',
        'water pump', 'fuel pump', 'turbocharger', 'fuel injector',
        'cv joint', 'control arm', 'tie rod', 'ball joint'
      ];
      
      if (sparePartsProductKeywords.some(k => matchesKeyword(productNameLower, k)) && finalCategory === 'general' && !isCarCareProduct) {
        finalCategory = 'spare_parts';
        console.log('Keyword override: spare_parts');
      }
      
      console.log('Final category after keyword checks:', finalCategory);
    }

    // Build response - remove internal fields
    const { weight_reasoning, is_hazardous, hazard_category, hazard_reason, ...baseResponse } = productInfo;
    
    const finalResponse: Record<string, unknown> = {
      ...baseResponse,
      origin_region: detectedRegion,
      product_category: finalCategory,
    };
    
    // Add hazard_details only if hazardous
    if (hazardResult.isHazardous && hazardResult.category) {
      finalResponse.hazard_details = {
        category: hazardResult.category,
        severity: hazardResult.severity,
        reason: hazardResult.reason,
        confidence: hazardResult.confidence,
      };
    }

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-product-info:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      product_name: 'Unknown Product',
      product_price: null,
      currency: 'USD',
      estimated_weight_kg: 1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
