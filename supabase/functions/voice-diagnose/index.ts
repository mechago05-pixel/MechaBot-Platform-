import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller to prevent abuse of paid AI endpoint
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { audio_base64, mime_type, text_description } = await req.json();

    if (!audio_base64 && !text_description) {
      return new Response(JSON.stringify({ error: "No audio or text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user content based on input type
    const userContent = audio_base64
      ? [
          {
            type: "input_audio",
            input_audio: {
              data: audio_base64,
              format: mime_type?.includes("webm")
                ? "webm"
                : mime_type?.includes("mp4") || mime_type?.includes("m4a")
                ? "mp4"
                : mime_type?.includes("wav")
                ? "wav"
                : "webm",
            },
          },
          {
            type: "text",
            text: "Please transcribe this voice note and diagnose the vehicle problem.",
          },
        ]
      : [
          {
            type: "text",
            text: `The customer describes their vehicle problem as follows:\n\n"${text_description}"\n\nPlease diagnose the vehicle problem. Set transcribed_message to the customer's description.`,
          },
        ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert automotive mechanic diagnostic AI for MechaBot, a vehicle repair service in Tanzania. 
You will receive a voice note from a customer describing their car problem.
First transcribe the audio accurately, then analyze the problem and provide a structured diagnosis.
If the audio is in Swahili, transcribe in Swahili but provide the summary in English.
Be concise and actionable in your diagnosis.`,
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "diagnose_vehicle",
                description:
                  "Return the transcribed message and vehicle problem diagnosis.",
                parameters: {
                  type: "object",
                  properties: {
                    transcribed_message: {
                      type: "string",
                      description:
                        "The exact transcription of the voice note.",
                    },
                    problem_summary: {
                      type: "string",
                      description:
                        "A brief summary of the detected vehicle problem in English.",
                    },
                    problem_category: {
                      type: "string",
                      enum: [
                        "engine",
                        "brakes",
                        "battery",
                        "transmission",
                        "electrical",
                        "flat-tire",
                        "cooling-system",
                        "fuel-system",
                        "oil-change",
                        "overheating",
                        "strange-noise",
                        "lights",
                        "not-starting",
                        "other",
                      ],
                      description: "The classified problem category.",
                    },
                    urgency_level: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                      description: "How urgent the repair is.",
                    },
                    recommended_mechanic_speciality: {
                      type: "string",
                      description:
                        "The mechanic specialty needed (e.g. engine, brakes, battery, electrical, tires).",
                    },
                  },
                  required: [
                    "transcribed_message",
                    "problem_summary",
                    "problem_category",
                    "urgency_level",
                    "recommended_mechanic_speciality",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "diagnose_vehicle" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI diagnosis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI did not return a structured diagnosis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const diagnosis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-diagnose error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
