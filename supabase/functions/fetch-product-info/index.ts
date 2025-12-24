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
        estimated_weight_kg: 0.5
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await pageResponse.text();
    
    // Truncate HTML to avoid token limits (keep first 15000 chars)
    const truncatedHtml = html.substring(0, 15000);

    // Use Lovable AI to extract product info
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
            content: `You are a product information extractor. Given HTML content from a product page, extract the product name, price, and estimate the shipping weight.

IMPORTANT: Return ONLY valid JSON, no markdown or extra text. Use this exact format:
{
  "product_name": "string - the product name",
  "product_price": number - price as a number (no currency symbols),
  "currency": "string - 3 letter currency code like USD, EUR, GBP, TZS",
  "estimated_weight_kg": number - estimated weight in kg based on the product type
}

For weight estimation, use common sense:
- Small electronics (phone cases, earbuds): 0.1-0.3 kg
- Medium electronics (tablets, small appliances): 0.5-2 kg  
- Clothing items: 0.2-0.8 kg
- Shoes: 0.5-1.5 kg
- Books: 0.3-1 kg
- Large electronics (laptops, monitors): 2-5 kg
- Furniture: 5-50 kg

If you cannot find the price, set product_price to null.
If you cannot identify the product, use "Unknown Product" as the name.`
          },
          {
            role: 'user',
            content: `Extract product information from this webpage HTML. URL: ${url}\n\nHTML Content:\n${truncatedHtml}`
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
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      productInfo = {
        product_name: 'Unknown Product',
        product_price: null,
        currency: 'USD',
        estimated_weight_kg: 0.5
      };
    }

    return new Response(JSON.stringify(productInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-product-info:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      product_name: 'Unknown Product',
      product_price: null,
      currency: 'USD',
      estimated_weight_kg: 0.5
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

