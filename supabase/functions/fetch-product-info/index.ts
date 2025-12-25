import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch the webpage
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      console.error('Failed to fetch page:', pageResponse.status);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch the webpage',
        product_name: 'Unknown Product',
        product_price: null,
        currency: 'USD',
        estimated_weight_kg: 1
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await pageResponse.text();
    
    // Detect the site for targeted extraction
    const urlLower = url.toLowerCase();
    const isEbay = urlLower.includes('ebay.');
    const isAmazon = urlLower.includes('amazon.');
    const isAliExpress = urlLower.includes('aliexpress.');
    const isEtsy = urlLower.includes('etsy.');
    const isWalmart = urlLower.includes('walmart.');
    const isTarget = urlLower.includes('target.');
    const isBestBuy = urlLower.includes('bestbuy.');
    
    // Try to extract price from structured data first (JSON-LD, meta tags)
    let extractedPrice: number | null = null;
    let extractedCurrency = 'USD';
    let extractedImage: string | null = null;
    let extractedName: string | null = null;
    
    // Detect currency from URL domain
    if (urlLower.includes('.co.uk') || urlLower.includes('.uk')) extractedCurrency = 'GBP';
    else if (urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es')) extractedCurrency = 'EUR';
    else if (urlLower.includes('.cn') || urlLower.includes('.com.cn')) extractedCurrency = 'CNY';
    else if (urlLower.includes('.in') || urlLower.includes('.co.in')) extractedCurrency = 'INR';
    else if (urlLower.includes('.ae')) extractedCurrency = 'AED';
    
    // Look for JSON-LD structured data (most reliable)
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const item of items) {
          // Check for Product schema
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
      
      // eBay price patterns (multiple formats)
      const ebayPatterns = [
        // Main price display patterns
        /class="x-price-primary"[^>]*>[\s\S]*?<span[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /class="x-bin-price"[^>]*>[\s\S]*?<span[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        /itemprop="price"[^>]*content="([\d.]+)"/i,
        /"binPrice":\s*"?([\d.]+)"?/i,
        /"price":\s*"?([\d.]+)"?/i,
        /data-testid="x-price-primary"[^>]*>[\s\S]*?([£$€]\s*[\d,]+\.?\d*)/i,
        /<span[^>]*class="[^"]*ux-textspans[^"]*"[^>]*>([£$€]\s*[\d,]+\.?\d*)<\/span>/i,
        /class="display-price"[^>]*>([£$€]\s*[\d,]+\.?\d*)/i,
        // BIN (Buy It Now) price
        /"BIN_PRICE":"([£$€]?[\d,]+\.?\d*)"/i,
        /"convertedBinPrice":"([£$€]?[\d,]+\.?\d*)"/i,
        // Auction current price
        /"currentPrice":\s*\{[^}]*"value":\s*([\d.]+)/i,
        // Price in hidden inputs
        /name="binPriceDouble"[^>]*value="([\d.]+)"/i,
        // Generic price patterns with currency symbols
        />([£$€]\s*[\d,]+\.?\d*)<\/span>/g,
      ];
      
      for (const pattern of ebayPatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 1000000) { // Sanity check
            extractedPrice = price;
            console.log('Found eBay price:', extractedPrice, 'from pattern:', pattern.source.substring(0, 50));
            break;
          }
        }
      }
      
      // Try to find currency from eBay page
      if (html.includes('£') || urlLower.includes('.co.uk')) extractedCurrency = 'GBP';
      else if (html.includes('€')) extractedCurrency = 'EUR';
      else extractedCurrency = 'USD';
    }
    
    // Amazon-specific extraction
    if (!extractedPrice && isAmazon) {
      console.log('Attempting Amazon-specific price extraction...');
      
      const amazonPatterns = [
        // Price whole and fraction
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
        // Currency symbol followed by numbers
        /(?:price|cost|amount)[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        /class="[^"]*price[^"]*"[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        /id="[^"]*price[^"]*"[^>]*>[\s]*([£$€]\s*[\d,]+\.?\d*)/gi,
        // Data attributes with price
        /data-price="([\d.]+)"/i,
        /data-product-price="([\d.]+)"/i,
      ];
      
      for (const pattern of genericPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const priceStr = match[1].replace(/[£$€,\s]/g, '');
          const price = parseFloat(priceStr);
          if (price > 0 && price < 100000) { // Reasonable price range
            extractedPrice = price;
            console.log('Found generic price:', extractedPrice);
            break;
          }
        }
        if (extractedPrice) break;
      }
    }
    
    console.log('Pre-extracted data:', { extractedPrice, extractedCurrency, extractedImage, extractedName });
    
    // Truncate HTML to avoid token limits (keep first 30000 chars for better context)
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
            content: `You are an expert product analyst specializing in e-commerce price extraction and logistics. Your PRIMARY task is to extract the PRODUCT PRICE and estimate shipping weight.

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

ELECTRONICS:
- Smartphone: 0.2-0.3 kg
- Laptop: 1.5-3 kg
- TV 55": 15-20 kg
- Gaming console: 3-5 kg

CLOTHING:
- Shoes: 0.8-1.5 kg
- Jacket: 0.5-1.5 kg
- Jeans: 0.5-0.8 kg

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "product_name": "full product name",
  "product_description": "1-2 sentence description",
  "product_image": "main image URL or null",
  "product_price": number (WITHOUT currency symbol) or null,
  "currency": "GBP/USD/EUR/etc",
  "estimated_weight_kg": number (rounded UP, minimum 1),
  "weight_reasoning": "brief explanation"
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
      // Try to extract JSON from the response (in case there's extra text)
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
        weight_reasoning: 'Could not analyze product, using default weight'
      };
    }

    // Remove weight_reasoning from response (internal use only)
    const { weight_reasoning, ...responseData } = productInfo;

    return new Response(JSON.stringify(responseData), {
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
