// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/app/lib/schema";
import { checkDictionary } from "@/app/lib/dictionary";
import { checkCustomModel } from "@/app/lib/ml";
import { checkGemini } from "@/app/lib/llm";
import { supabase } from "@/app/lib/supabase";

// --- NEW HELPER FUNCTION FOR SENTENCE CASING ---
function toSentenceCase(str: string): string {
  return str
    .toLowerCase()
    // FIX: Removed the unnecessary backslashes inside the square brackets [.!?]
    .replace(/(^\s*\p{L}|[.!?]\s*\p{L})/gu, (char) => char.toUpperCase());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = body.text || "";

    // ------------------------------------------------------------------
    // SANITIZATION LAYER: Remove Emojis & Apply Sentence Case
    // ------------------------------------------------------------------
    const noEmojiText = rawText
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      .trim();

    // Apply the sentence casing rule
    const text = toSentenceCase(noEmojiText);

    if (!text) {
      return NextResponse.json(
        { error: "Text is empty or contains only emojis." }, 
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // LAYER 1: Dictionary Check (Fast fail)
    // ------------------------------------------------------------------
    const matchedWords = checkDictionary(text);

    if (matchedWords.length > 0) {
      
      // LOG TO SUPABASE BEFORE RETURNING
      await supabase.from('search_logs').insert([{
        searched_text: text, // Will log as: "Frer mn plein dn mo lavi. Mo p envi al drmi"
        detected_language: "creole",
        toxicity_result: "unsafe"
      }]);

      return NextResponse.json<AnalysisResult>({
        overall_label: "unsafe",
        dictionary_match: true,
        matched_words: matchedWords,
        detected_language: "creole"
      });
    }

    // 2 & 3. Run Models in Parallel
const [modelResultRaw, geminiResponse] = await Promise.all([
      checkCustomModel(text),
      checkGemini(text)
    ]);

    const geminiResultLabel = geminiResponse.is_toxic ? "unsafe" : "safe";
    
    // --- UPDATED LOGIC HERE ---
    // Instead of checking if it IS creole, we check if it IS NOT English or French.
    // This forces everything else into the "creole" category logic.
    const isStandardForeign = geminiResponse.detected_language === "french" || geminiResponse.detected_language === "english";
    const finalDetectedLanguage = isStandardForeign ? geminiResponse.detected_language : "creole";

    let overall_label: "safe" | "unsafe" | "human_review" = "safe";
    let final_model_result: "safe" | "unsafe" | "skipped" = modelResultRaw;

    if (isStandardForeign) {
      // If it's English/French, we skip the Custom ML result and trust Gemini
      final_model_result = "skipped";
      overall_label = geminiResultLabel;
    } else {
      // If it's NOT English/French (Defaulting to Creole), we compare both results
      if (modelResultRaw === "unsafe" && geminiResultLabel === "unsafe") {
        overall_label = "unsafe";
      } else if (modelResultRaw === "safe" && geminiResultLabel === "safe") {
        overall_label = "safe";
      } else {
        overall_label = "human_review";
      }
    }

    // LOG TO SUPABASE
    await supabase.from('search_logs').insert([{
      searched_text: text,
      detected_language: finalDetectedLanguage, // Uses our "forced" creole default
      toxicity_result: overall_label
    }]);

    return NextResponse.json<AnalysisResult>({
      overall_label,
      dictionary_match: false,
      model_result: final_model_result,
      gemini_result: geminiResultLabel,
      gemini_explanation: geminiResponse.explanation,
      detected_language: finalDetectedLanguage // Sends "creole" to the frontend if not En/Fr
    });
	
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text" }, 
      { status: 500 }
    );
  }
}