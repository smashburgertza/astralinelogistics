import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout wrapper for fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Try multiple user agents for better compatibility
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

async function fetchPageWithRetry(url: string, maxRetries = 2): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const userAgent = USER_AGENTS[i % USER_AGENTS.length];
    try {
      console.log(`Fetch attempt ${i + 1} with UA: ${userAgent.substring(0, 50)}...`);
      
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      }, 20000);

      if (response.ok) {
        const html = await response.text();
        console.log(`Successfully fetched page, HTML length: ${html.length}`);
        return html;
      } else {
        console.log(`Fetch failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
    }
  }
  return null;
}

// Extract structured data from various sources
function extractStructuredData(html: string, urlLower: string) {
  let extractedPrice: number | null = null;
  let extractedImage: string | null = null;
  let extractedTitle: string | null = null;
  let extractedMake: string | null = null;
  let extractedModel: string | null = null;
  let extractedYear: number | null = null;

  // Look for JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      const items = Array.isArray(jsonData) ? jsonData : [jsonData];
      for (const item of items) {
        if (item['@type'] === 'Vehicle' || item['@type'] === 'Car' || item['@type'] === 'Product' || item['@type'] === 'Automobile') {
          if (item.name) extractedTitle = item.name;
          if (item.brand?.name) extractedMake = item.brand.name;
          if (item.model) extractedModel = item.model;
          if (item.vehicleModelDate) extractedYear = parseInt(item.vehicleModelDate);
          if (item.image) {
            const imgData = Array.isArray(item.image) ? item.image[0] : item.image;
            if (typeof imgData === 'string') extractedImage = imgData;
            else if (imgData?.url) extractedImage = imgData.url;
          }
          const offers = item.offers || item.Offers;
          if (offers) {
            const offer = Array.isArray(offers) ? offers[0] : offers;
            if (offer.price) {
              extractedPrice = parseFloat(String(offer.price).replace(/[^0-9.]/g, ''));
            }
          }
        }
      }
    } catch (e) {
      // JSON parsing failed, continue
    }
  }

  // Site-specific extraction patterns
  const isEbay = urlLower.includes('ebay.');
  const isAutoTrader = urlLower.includes('autotrader.');
  const isCarGurus = urlLower.includes('cargurus.');
  const isCopart = urlLower.includes('copart.');
  const isCarscom = urlLower.includes('cars.com');
  
  // eBay-specific extraction
  if (isEbay) {
    console.log('Applying eBay-specific extraction...');
    
    // Price patterns for eBay
    const ebayPricePatterns = [
      /"price":\s*"?([\d,.]+)"?/,
      /"convertedFromValue":\s*"?([\d,.]+)"?/,
      /itemprop="price"\s+content="([\d,.]+)"/,
      /class="[^"]*x-price-primary[^"]*"[^>]*>.*?([£$€]\s*[\d,.]+)/s,
      /ux-textspans[^>]*>([£$€]\s*[\d,.]+)</,
      /"binPrice":\s*"([^"]+)"/,
      /"displayPrice":\s*"([^"]+)"/,
      /Price:?\s*([£$€]\s*[\d,.]+)/i,
      /Buy\s*It\s*Now.*?([£$€]\s*[\d,.]+)/is,
    ];
    
    if (!extractedPrice) {
      for (const pattern of ebayPricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/[^0-9.]/g, '');
          const price = parseFloat(priceStr);
          if (price > 100) { // Vehicles should be > 100
            extractedPrice = price;
            console.log('Found eBay price:', price);
            break;
          }
        }
      }
    }
    
    // eBay image patterns
    if (!extractedImage) {
      const ebayImagePatterns = [
        /"image":\s*\["([^"]+)"/,
        /"imageUrl":\s*"([^"]+)"/,
        /data-zoom-src="([^"]+)"/,
        /icImg[^>]+src="([^"]+)"/,
        /<img[^>]+class="[^"]*ux-image[^"]*"[^>]+src="([^"]+)"/i,
      ];
      for (const pattern of ebayImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1].startsWith('http')) {
          extractedImage = match[1];
          console.log('Found eBay image');
          break;
        }
      }
    }
  }
  
  // AutoTrader-specific extraction
  if (isAutoTrader) {
    console.log('Applying AutoTrader-specific extraction...');
    const atPriceMatch = html.match(/"price":\s*(\d+)/) || html.match(/£([\d,]+)/);
    if (atPriceMatch && !extractedPrice) {
      extractedPrice = parseFloat(atPriceMatch[1].replace(/,/g, ''));
    }
  }
  
  // Copart-specific extraction
  if (isCopart) {
    console.log('Applying Copart-specific extraction...');
    const copartPriceMatch = html.match(/Buy\s*Now.*?\$([\d,]+)/is) || html.match(/Current\s*Bid.*?\$([\d,]+)/is);
    if (copartPriceMatch && !extractedPrice) {
      extractedPrice = parseFloat(copartPriceMatch[1].replace(/,/g, ''));
    }
  }

  // Open Graph meta tags
  if (!extractedImage) {
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) extractedImage = ogImageMatch[1];
  }
  
  if (!extractedTitle) {
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) extractedTitle = ogTitleMatch[1];
  }
  
  // Fallback to title tag
  if (!extractedTitle) {
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTagMatch) extractedTitle = titleTagMatch[1].trim();
  }

  // Try to extract year from title
  if (!extractedYear && extractedTitle) {
    const yearMatch = extractedTitle.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) extractedYear = parseInt(yearMatch[0]);
  }

  return {
    extractedPrice,
    extractedImage,
    extractedTitle,
    extractedMake,
    extractedModel,
    extractedYear,
  };
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

    console.log('Fetching vehicle URL:', url);

    // Fetch the webpage with retry
    const html = await fetchPageWithRetry(url);

    if (!html) {
      console.error('Failed to fetch page after retries');
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch the webpage. The site may be blocking automated requests.',
        make: null,
        model: null,
        year: null,
        vehicle_type: 'sedan',
        price: null,
        currency: 'USD',
        image_url: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const urlLower = url.toLowerCase();
    
    // Detect currency and origin region from URL domain
    let detectedCurrency = 'USD';
    let detectedRegion = 'usa';
    
    if (urlLower.includes('.co.uk') || urlLower.includes('.uk')) {
      detectedCurrency = 'GBP';
      detectedRegion = 'uk';
    } else if (urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es') || urlLower.includes('.eu')) {
      detectedCurrency = 'EUR';
      detectedRegion = 'europe';
    } else if (urlLower.includes('.ae') || urlLower.includes('dubizzle') || urlLower.includes('dubicars')) {
      detectedCurrency = 'AED';
      detectedRegion = 'dubai';
    } else if (urlLower.includes('.jp') || urlLower.includes('japanesecartrade') || urlLower.includes('tradecarview')) {
      detectedCurrency = 'JPY';
      detectedRegion = 'japan';
    } else if (urlLower.includes('.cn') || urlLower.includes('alibaba')) {
      detectedCurrency = 'CNY';
      detectedRegion = 'china';
    }
    
    console.log('Detected region:', detectedRegion, 'currency:', detectedCurrency);
    
    // Extract structured data
    const extracted = extractStructuredData(html, urlLower);
    console.log('Pre-extracted data:', extracted);
    
    // Detect site type for better AI context
    const isAutoTrader = urlLower.includes('autotrader.');
    const isCarGurus = urlLower.includes('cargurus.');
    const isCopart = urlLower.includes('copart.');
    const isEbay = urlLower.includes('ebay.');
    const isCarscom = urlLower.includes('cars.com');
    const isIAA = urlLower.includes('iaai.');
    const isBringATrailer = urlLower.includes('bringatrailer.');
    
    let siteType = 'car listing';
    if (isAutoTrader) siteType = 'AutoTrader';
    else if (isCarGurus) siteType = 'CarGurus';
    else if (isCopart) siteType = 'Copart auction';
    else if (isEbay) siteType = 'eBay Motors';
    else if (isCarscom) siteType = 'Cars.com';
    else if (isIAA) siteType = 'IAA auction';
    else if (isBringATrailer) siteType = 'Bring a Trailer auction';
    
    // Truncate HTML intelligently - focus on relevant content
    let relevantHtml = html;
    
    // Try to extract just the main content area
    const mainContentPatterns = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    
    for (const pattern of mainContentPatterns) {
      const match = html.match(pattern);
      if (match && match[1].length > 1000) {
        relevantHtml = match[1];
        break;
      }
    }
    
    // Remove scripts and styles
    relevantHtml = relevantHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    const truncatedHtml = relevantHtml.substring(0, 40000);

    // Use Lovable AI to extract vehicle info
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Return pre-extracted data if AI is not available
      return new Response(JSON.stringify({
        make: extracted.extractedMake,
        model: extracted.extractedModel,
        year: extracted.extractedYear,
        vehicle_type: 'sedan',
        price: extracted.extractedPrice,
        currency: detectedCurrency,
        title: extracted.extractedTitle,
        image_url: extracted.extractedImage,
        origin_region: detectedRegion,
        mileage: null,
        engine: null,
        engine_cc: null,
        transmission: null,
        fuel_type: null,
        color: null,
        vin: null,
        condition: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling AI for vehicle extraction...');
    
    const aiResponse = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert vehicle data analyst. Extract vehicle information from car listing pages.

## VEHICLE TYPE CLASSIFICATION
- "motorcycle": Motorcycles, scooters, ATVs
- "sedan": Cars, coupes, hatchbacks, wagons
- "suv": SUVs, crossovers, Jeeps, Land Rovers, 4x4s
- "truck": Pickup trucks, vans, lorries

## EXTRACT THESE FIELDS
- make: Manufacturer (Toyota, BMW, Ford, etc.)
- model: Model name (Camry, 3 Series, F-150)
- year: 4-digit year (2020)
- vehicle_type: One of the categories above
- mileage: As string with units
- engine: Engine description (e.g., "3.0L V6 Turbo")
- engine_cc: Engine size in cc (e.g., 3000 for 3.0L)
- transmission: Automatic, Manual, CVT
- fuel_type: Petrol, Diesel, Electric, Hybrid
- color: Exterior color
- vin: Vehicle ID number if visible
- price: Number only, no currency symbols
- currency: USD, GBP, EUR, AED, JPY
- condition: New, Used, Salvage, etc.
- title: Full listing title
- image_url: Main image URL

## OUTPUT
Return ONLY valid JSON with these exact field names. Use null for missing values.`
          },
          {
            role: 'user',
            content: `Extract vehicle details from this ${siteType} page.

PRE-EXTRACTED HINTS:
${extracted.extractedTitle ? `- Title: ${extracted.extractedTitle}` : ''}
${extracted.extractedPrice ? `- Price: ${extracted.extractedPrice} ${detectedCurrency}` : ''}
${extracted.extractedMake ? `- Make: ${extracted.extractedMake}` : ''}
${extracted.extractedModel ? `- Model: ${extracted.extractedModel}` : ''}
${extracted.extractedYear ? `- Year: ${extracted.extractedYear}` : ''}
${extracted.extractedImage ? `- Image: ${extracted.extractedImage}` : ''}

Region: ${detectedRegion} (${detectedCurrency})
URL: ${url}

PAGE CONTENT:
${truncatedHtml}`
          }
        ],
      }),
    }, 30000);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Return pre-extracted data on AI failure
      return new Response(JSON.stringify({
        make: extracted.extractedMake,
        model: extracted.extractedModel,
        year: extracted.extractedYear,
        vehicle_type: 'sedan',
        price: extracted.extractedPrice,
        currency: detectedCurrency,
        title: extracted.extractedTitle,
        image_url: extracted.extractedImage,
        origin_region: detectedRegion,
        mileage: null,
        engine: null,
        engine_cc: null,
        transmission: null,
        fuel_type: null,
        color: null,
        vin: null,
        condition: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, length:', content.length);

    // Parse the JSON from AI response
    let vehicleInfo;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        vehicleInfo = JSON.parse(jsonMatch[0]);
        
        // Use pre-extracted data as fallback
        if (!vehicleInfo.price && extracted.extractedPrice) {
          vehicleInfo.price = extracted.extractedPrice;
        }
        if (!vehicleInfo.image_url && extracted.extractedImage) {
          vehicleInfo.image_url = extracted.extractedImage;
        }
        if (!vehicleInfo.title && extracted.extractedTitle) {
          vehicleInfo.title = extracted.extractedTitle;
        }
        if (!vehicleInfo.make && extracted.extractedMake) {
          vehicleInfo.make = extracted.extractedMake;
        }
        if (!vehicleInfo.model && extracted.extractedModel) {
          vehicleInfo.model = extracted.extractedModel;
        }
        if (!vehicleInfo.year && extracted.extractedYear) {
          vehicleInfo.year = extracted.extractedYear;
        }
        if (!vehicleInfo.currency) {
          vehicleInfo.currency = detectedCurrency;
        }
        
        // Ensure vehicle_type is valid
        if (!['motorcycle', 'sedan', 'suv', 'truck'].includes(vehicleInfo.vehicle_type)) {
          vehicleInfo.vehicle_type = 'sedan';
        }
        
        // Add origin region
        vehicleInfo.origin_region = detectedRegion;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      vehicleInfo = {
        make: extracted.extractedMake,
        model: extracted.extractedModel,
        year: extracted.extractedYear,
        vehicle_type: 'sedan',
        mileage: null,
        engine: null,
        engine_cc: null,
        transmission: null,
        fuel_type: null,
        color: null,
        vin: null,
        price: extracted.extractedPrice,
        currency: detectedCurrency,
        condition: null,
        title: extracted.extractedTitle,
        image_url: extracted.extractedImage,
        origin_region: detectedRegion
      };
    }

    console.log('Final vehicle info:', JSON.stringify(vehicleInfo));

    return new Response(JSON.stringify(vehicleInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in fetch-vehicle-info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vehicle info';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      make: null,
      model: null,
      year: null,
      vehicle_type: 'sedan',
      price: null,
      currency: 'USD',
      image_url: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
