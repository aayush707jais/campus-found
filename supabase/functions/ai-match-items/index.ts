import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  type: "lost" | "found";
  image_url: string | null;
  user_id: string;
}

interface MatchResult {
  itemId: string;
  matchedItemId: string;
  score: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { action, item, items, targetItem } = await req.json();

    // Action: "find_matches" - Find matches for a newly posted item
    // Action: "get_match_score" - Get AI match score between two specific items
    // Action: "batch_match" - Get AI scores for an item against multiple items

    if (action === "find_matches" && item) {
      // Get opposite type items from database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const oppositeType = item.type === "lost" ? "found" : "lost";
      
      const { data: potentialMatches, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", oppositeType)
        .eq("status", "active")
        .neq("user_id", item.user_id)
        .limit(20);

      if (error) {
        console.error("Error fetching potential matches:", error);
        throw error;
      }

      if (!potentialMatches || potentialMatches.length === 0) {
        return new Response(JSON.stringify({ matches: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use AI to analyze matches
      const matches = await analyzeMatches(item, potentialMatches, LOVABLE_API_KEY);

      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_match" && targetItem && items) {
      // Get AI scores for multiple items
      const matches = await analyzeMatches(targetItem, items, LOVABLE_API_KEY);
      
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_match_score" && item && targetItem) {
      const score = await getSingleMatchScore(item, targetItem, LOVABLE_API_KEY);
      
      return new Response(JSON.stringify(score), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-match-items:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function analyzeMatches(
  sourceItem: Item,
  candidates: Item[],
  apiKey: string
): Promise<MatchResult[]> {
  const candidatesInfo = candidates.map((c, idx) => ({
    index: idx,
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    date: c.date,
    hasImage: !!c.image_url,
    imageUrl: c.image_url,
  }));

  const messages: any[] = [
    {
      role: "system",
      content: `You are an AI assistant that helps match lost and found items. Analyze the source item and compare it with candidate items to find potential matches.

Consider these factors when scoring:
1. Category match (very important)
2. Description similarity - look for matching keywords, colors, brands, models
3. Location proximity - similar locations or areas
4. Date proximity - items lost/found around the same time
5. Visual similarity if images are provided

Return a JSON array of matches with scores from 0-100. Only include items with score >= 40.

Response format:
{
  "matches": [
    {
      "index": 0,
      "score": 85,
      "reasoning": "Brief explanation of why this is a match"
    }
  ]
}`
    }
  ];

  // Build the user message with text content
  const userContent: any[] = [];
  
  let textPrompt = `SOURCE ITEM (${sourceItem.type.toUpperCase()}):
Title: ${sourceItem.title}
Description: ${sourceItem.description}
Category: ${sourceItem.category}
Location: ${sourceItem.location}
Date: ${sourceItem.date}
Has Image: ${sourceItem.image_url ? "Yes" : "No"}

CANDIDATE ITEMS TO COMPARE:
${candidatesInfo.map((c) => `
[${c.index}] ID: ${c.id}
Title: ${c.title}
Description: ${c.description}
Category: ${c.category}
Location: ${c.location}
Date: ${c.date}
Has Image: ${c.hasImage ? "Yes" : "No"}
`).join("\n")}

Analyze each candidate and return matching scores.`;

  userContent.push({ type: "text", text: textPrompt });

  // Add source image if available
  if (sourceItem.image_url && !sourceItem.image_url.startsWith("/")) {
    userContent.push({
      type: "image_url",
      image_url: { url: sourceItem.image_url }
    });
    userContent.push({ type: "text", text: "Above is the SOURCE ITEM image." });
  }

  // Add candidate images (limit to first 5 with images)
  const candidatesWithImages = candidates.filter(c => c.image_url && !c.image_url.startsWith("/")).slice(0, 5);
  for (const candidate of candidatesWithImages) {
    const idx = candidates.findIndex(c => c.id === candidate.id);
    userContent.push({
      type: "image_url",
      image_url: { url: candidate.image_url! }
    });
    userContent.push({ type: "text", text: `Above is candidate [${idx}] image.` });
  }

  messages.push({ role: "user", content: userContent });

  console.log("Calling AI for match analysis...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI service requires payment. Please add credits.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in AI response");
    return [];
  }

  try {
    const parsed = JSON.parse(content);
    const aiMatches = parsed.matches || [];

    return aiMatches
      .filter((m: any) => m.score >= 40)
      .map((m: any) => ({
        itemId: sourceItem.id,
        matchedItemId: candidates[m.index]?.id,
        score: m.score,
        reasoning: m.reasoning,
      }))
      .filter((m: MatchResult) => m.matchedItemId);
  } catch (e) {
    console.error("Error parsing AI response:", e, content);
    return [];
  }
}

async function getSingleMatchScore(
  item1: Item,
  item2: Item,
  apiKey: string
): Promise<{ score: number; reasoning: string }> {
  const userContent: any[] = [];

  let textPrompt = `Compare these two items and determine if they could be the same item (one lost, one found).

ITEM 1 (${item1.type.toUpperCase()}):
Title: ${item1.title}
Description: ${item1.description}
Category: ${item1.category}
Location: ${item1.location}
Date: ${item1.date}

ITEM 2 (${item2.type.toUpperCase()}):
Title: ${item2.title}
Description: ${item2.description}
Category: ${item2.category}
Location: ${item2.location}
Date: ${item2.date}

Return a JSON object with:
- score: 0-100 representing match likelihood
- reasoning: brief explanation`;

  userContent.push({ type: "text", text: textPrompt });

  // Add images if available
  if (item1.image_url && !item1.image_url.startsWith("/")) {
    userContent.push({
      type: "image_url",
      image_url: { url: item1.image_url }
    });
    userContent.push({ type: "text", text: "Above is ITEM 1 image." });
  }

  if (item2.image_url && !item2.image_url.startsWith("/")) {
    userContent.push({
      type: "image_url",
      image_url: { url: item2.image_url }
    });
    userContent.push({ type: "text", text: "Above is ITEM 2 image." });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are an AI that matches lost and found items. Return JSON only."
        },
        { role: "user", content: userContent }
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("Payment required");
    }
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content);
    return {
      score: parsed.score || 0,
      reasoning: parsed.reasoning || "Unable to determine match"
    };
  } catch {
    return { score: 0, reasoning: "Error analyzing match" };
  }
}
