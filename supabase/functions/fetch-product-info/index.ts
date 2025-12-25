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
    
    // Try to extract price from structured data first (JSON-LD, meta tags)
    let extractedPrice: number | null = null;
    let extractedCurrency = 'USD';
    let extractedImage: string | null = null;
    let extractedName: string | null = null;
    
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
                extractedCurrency = offer.priceCurrency || 'USD';
                console.log('Found price in JSON-LD:', extractedPrice, extractedCurrency);
              }
            }
          }
        }
      } catch (e) {
        // JSON parsing failed, continue
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
    
    console.log('Pre-extracted data:', { extractedPrice, extractedCurrency, extractedImage, extractedName });
    
    // Truncate HTML to avoid token limits (keep first 20000 chars for better context)
    const truncatedHtml = html.substring(0, 20000);

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
            content: `You are an expert product analyst specializing in logistics and shipping weight estimation. Your task is to extract product information and ACCURATELY estimate the shipping weight in kilograms.

CRITICAL: You must reason about the actual product weight based on:
1. Product category and type
2. Dimensions if mentioned (length x width x height)
3. Materials (metal, plastic, fabric, wood, glass, etc.)
4. Any weight specifications on the page
5. Similar products' typical weights

WEIGHT ESTIMATION GUIDE (use these as reference, adjust based on actual product details):

ELECTRONICS:
- Smartphone: 0.2-0.3 kg
- Phone case/accessories: 0.1 kg
- Earbuds/AirPods: 0.1 kg
- Smartwatch: 0.1-0.2 kg
- Tablet (iPad size): 0.5-0.8 kg
- Laptop 13": 1.3-1.8 kg
- Laptop 15-16": 1.8-2.5 kg
- Gaming laptop: 2.5-3.5 kg
- Monitor 24": 3-5 kg
- Monitor 27"+: 5-8 kg
- Desktop computer: 8-15 kg
- TV 32": 5-7 kg
- TV 55": 15-20 kg
- TV 65"+: 25-35 kg
- Printer: 5-15 kg
- Gaming console: 3-5 kg
- Camera: 0.5-1.5 kg
- Drone: 0.5-2 kg

CLOTHING & FASHION:
- T-shirt/Top: 0.2-0.3 kg
- Dress shirt: 0.25-0.35 kg
- Jeans: 0.5-0.8 kg
- Dress: 0.3-0.6 kg
- Jacket (light): 0.5-1 kg
- Winter coat: 1-2.5 kg
- Suit: 1-1.5 kg
- Sweater/Hoodie: 0.4-0.8 kg
- Shoes (pair): 0.8-1.5 kg
- Boots: 1.5-2.5 kg
- Sneakers: 0.8-1.2 kg
- Bag/Purse: 0.5-2 kg
- Backpack: 0.8-1.5 kg

HOME & KITCHEN:
- Small appliance (blender, toaster): 1-3 kg
- Microwave: 10-15 kg
- Coffee machine: 3-8 kg
- Air fryer: 4-7 kg
- Vacuum cleaner: 3-8 kg
- Robot vacuum: 3-5 kg
- Cookware set: 5-15 kg
- Single pot/pan: 1-3 kg
- Dishes set: 5-10 kg
- Bedding/Sheets: 2-4 kg
- Pillows: 0.5-1 kg each
- Towels: 0.5-1 kg each
- Small furniture: 10-30 kg
- Chair: 5-15 kg
- Table: 15-50 kg

SPORTS & FITNESS:
- Yoga mat: 1-2 kg
- Dumbbells (pair): actual weight + 0.5 kg packaging
- Bicycle: 10-15 kg
- Treadmill: 50-100 kg
- Sports equipment: 0.5-5 kg

BOOKS & MEDIA:
- Paperback book: 0.2-0.4 kg
- Hardcover book: 0.5-1 kg
- Textbook: 1-2 kg

TOYS & GAMES:
- Action figure: 0.1-0.3 kg
- Board game: 0.5-2 kg
- LEGO set (small): 0.3-1 kg
- LEGO set (large): 2-5 kg
- Video game: 0.1 kg

BEAUTY & PERSONAL CARE:
- Perfume/Cologne: 0.2-0.5 kg
- Makeup set: 0.3-1 kg
- Skincare products: 0.2-0.5 kg
- Hair dryer: 0.5-1 kg

Always round up to ensure safe shipping estimates. If the page shows actual weight, USE THAT VALUE.

IMPORTANT: Return ONLY valid JSON, no markdown or extra text. Use this exact format:
{
  "product_name": "string - the full product name",
  "product_description": "string - a brief 1-2 sentence description of the product",
  "product_image": "string or null - the main product image URL (look for og:image, product images, or main image)",
  "product_price": number or null - price as a number without currency symbols,
  "currency": "string - 3 letter currency code (USD, EUR, GBP, AED, CNY, INR, TZS)",
  "estimated_weight_kg": number - weight in kg rounded UP to nearest whole number (minimum 1),
  "weight_reasoning": "string - brief explanation of how you estimated the weight"
}

CRITICAL RULES:
1. If page shows actual weight (in kg, lbs, g, oz), convert to kg and use that
2. ALWAYS round UP to the nearest whole kilogram (e.g., 0.3 kg → 1 kg, 1.2 kg → 2 kg)
3. Minimum weight is 1 kg
4. When in doubt, estimate higher rather than lower for shipping safety
5. For product_image, look for: og:image meta tag, itemprop="image", product gallery images, or any prominent product photo URL`
          },
          {
            role: 'user',
            content: `Analyze this product page and extract information. Pay special attention to finding the actual weight if listed, otherwise reason about what this specific product should weigh.

${extractedPrice ? `IMPORTANT: We already extracted a price of ${extractedPrice} ${extractedCurrency} from structured data. Use this unless you find a more accurate price.` : 'IMPORTANT: Try hard to find the product price on the page.'}
${extractedName ? `Product name hint: ${extractedName}` : ''}
${extractedImage ? `Product image hint: ${extractedImage}` : ''}

URL: ${url}

HTML Content:
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
