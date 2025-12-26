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

    console.log('Fetching vehicle URL:', url);

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

    const html = await pageResponse.text();
    const urlLower = url.toLowerCase();
    
    // Detect the site for targeted extraction
    const isAutoTrader = urlLower.includes('autotrader.');
    const isCarGurus = urlLower.includes('cargurus.');
    const isCarscom = urlLower.includes('cars.com');
    const isEbayMotors = urlLower.includes('ebay.') && (urlLower.includes('motors') || urlLower.includes('/itm/'));
    const isCarmax = urlLower.includes('carmax.');
    const isCopart = urlLower.includes('copart.');
    const isIAA = urlLower.includes('iaai.');
    const isBringATrailer = urlLower.includes('bringatrailer.');
    
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
    }
    
    console.log('Detected region:', detectedRegion, 'currency:', detectedCurrency);
    
    // Pre-extract data from structured data
    let extractedPrice: number | null = null;
    let extractedImage: string | null = null;
    let extractedTitle: string | null = null;
    
    // Look for JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const item of items) {
          if (item['@type'] === 'Vehicle' || item['@type'] === 'Car' || item['@type'] === 'Product') {
            if (item.name) extractedTitle = item.name;
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
    
    // Look for Open Graph meta tags
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    
    if (!extractedImage && ogImageMatch) extractedImage = ogImageMatch[1];
    if (!extractedTitle && ogTitleMatch) extractedTitle = ogTitleMatch[1];
    
    console.log('Pre-extracted data:', { extractedPrice, extractedImage, extractedTitle });
    
    // Truncate HTML to avoid token limits
    const truncatedHtml = html.substring(0, 35000);

    // Use Lovable AI to extract vehicle info
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
            content: `You are an expert vehicle data analyst specializing in automotive listings extraction. Your task is to extract comprehensive vehicle information from car listing pages.

## VEHICLE TYPE CLASSIFICATION

Classify vehicles into these categories:
- "motorcycle": Motorcycles, scooters, mopeds, ATVs, dirt bikes
- "sedan": Standard cars, coupes, hatchbacks, station wagons
- "suv": SUVs, crossovers, Jeeps, Land Rovers, 4x4s
- "truck": Pickup trucks, commercial trucks, vans, lorries

## DATA TO EXTRACT

1. **Make/Manufacturer**: Toyota, BMW, Mercedes, Ford, etc.
2. **Model**: Camry, 3 Series, C-Class, F-150, etc.
3. **Year**: Manufacturing year (e.g., 2020)
4. **Vehicle Type**: Based on classification above
5. **Mileage**: If available (in miles or km)
6. **Engine**: Engine size/type if available (e.g., "2.0L Turbo")
7. **Transmission**: Automatic, Manual, CVT
8. **Fuel Type**: Petrol/Gasoline, Diesel, Electric, Hybrid
9. **Color**: Exterior color if visible
10. **VIN**: Vehicle Identification Number if visible
11. **Price**: Listed price (number only, no currency symbol)
12. **Condition**: New, Used, Salvage, Certified Pre-Owned

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "make": "string or null",
  "model": "string or null", 
  "year": number or null,
  "vehicle_type": "motorcycle" | "sedan" | "suv" | "truck",
  "mileage": "string or null",
  "engine": "string or null (e.g., '2.0L Turbo')",
  "engine_cc": number or null (engine displacement in cc, e.g., 2000 for a 2.0L engine),
  "transmission": "string or null",
  "fuel_type": "string or null",
  "color": "string or null",
  "vin": "string or null",
  "price": number or null,
  "currency": "USD" | "GBP" | "EUR" | "AED" | "JPY",
  "condition": "string or null",
  "title": "full listing title",
  "image_url": "main image URL or null"
}

IMPORTANT:
- price MUST be a number without currency symbols
- year MUST be a 4-digit number (e.g., 2020)
- engine_cc should be the engine size in cubic centimeters (cc), e.g., 2000 for 2.0L, 1600 for 1.6L
- vehicle_type MUST be one of the four options listed`
          },
          {
            role: 'user',
            content: `Extract vehicle details from this ${isAutoTrader ? 'AutoTrader' : isCarGurus ? 'CarGurus' : isCopart ? 'Copart' : isEbayMotors ? 'eBay Motors' : 'car listing'} page.

${extractedTitle ? `Title hint: ${extractedTitle}` : ''}
${extractedPrice ? `Price hint: ${extractedPrice} ${detectedCurrency}` : ''}
${extractedImage ? `Image hint: ${extractedImage}` : ''}

Detected region: ${detectedRegion} (currency: ${detectedCurrency})

URL: ${url}

HTML:
${truncatedHtml}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to analyze vehicle with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from AI response
    let vehicleInfo;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        vehicleInfo = JSON.parse(jsonMatch[0]);
        
        // Use pre-extracted data as fallback
        if (!vehicleInfo.price && extractedPrice) {
          vehicleInfo.price = extractedPrice;
        }
        if (!vehicleInfo.image_url && extractedImage) {
          vehicleInfo.image_url = extractedImage;
        }
        if (!vehicleInfo.currency) {
          vehicleInfo.currency = detectedCurrency;
        }
        
        // Add origin region
        vehicleInfo.origin_region = detectedRegion;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      vehicleInfo = {
        make: null,
        model: null,
        year: null,
        vehicle_type: 'sedan',
        mileage: null,
        engine: null,
        transmission: null,
        fuel_type: null,
        color: null,
        vin: null,
        price: extractedPrice,
        currency: detectedCurrency,
        condition: null,
        title: extractedTitle,
        image_url: extractedImage,
        origin_region: detectedRegion
      };
    }

    console.log('Final vehicle info:', vehicleInfo);

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
