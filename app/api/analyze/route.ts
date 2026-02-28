// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/app/lib/schema";
import { checkDictionary } from "@/app/lib/dictionary";
import { checkCustomModel } from "@/app/lib/ml";
import { checkGemini } from "@/app/lib/llm";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = body.text || "";

    // ------------------------------------------------------------------
    // SANITIZATION LAYER: Lowercase, Remove Emojis & Remove Punctuation
    // ------------------------------------------------------------------
    const text = rawText
      .toLowerCase()                                                      // 1. Force small letters
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "") // 2. Remove emojis
      .replace(/[^\p{L}\p{N}\s]/gu, "")                                   // 3. Remove punctuation
      .replace(/\s{2,}/g, " ")                                            // 4. Shrink double spaces
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Text is empty or contains only emojis/punctuation." }, 
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
        raw_text: rawText,       // <-- What the user typed
        searched_text: text,     // <-- Cleaned text
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

    // ------------------------------------------------------------------
    // LAYER 2 & 3: Run Models in Parallel
    // ------------------------------------------------------------------
    // Catch the objects returned by the updated models
    const [mlResponse, geminiResponse] = await Promise.all([
      checkCustomModel(text),
      checkGemini(text)
    ]);

    // Extract labels and confidence scores
    const modelResultLabel = mlResponse.label;
    const mlConfidence = mlResponse.confidence;
	const mlToxicWords = mlResponse.toxic_words;
    
    const geminiResultLabel = geminiResponse.is_toxic ? "unsafe" : "safe";
    const geminiConfidence = geminiResponse.confidence_score;
    
    // --- LANGUAGE ROUTING LOGIC ---
    const detectedLangStr = geminiResponse.detected_language.toLowerCase();
    const hasCreole = detectedLangStr.includes("creole");
    
    const finalDetectedLanguage = detectedLangStr || "creole";

    let overall_label: "safe" | "unsafe" | "human_review" = "safe";
    let final_model_result: "safe" | "unsafe" | "skipped" = modelResultLabel;

    if (!hasCreole) {
      // If it DOES NOT contain Creole, skip ML
      final_model_result = "skipped";
      overall_label = geminiResultLabel;
    } else {
      // If it DOES contain Creole, compare both results
      if (modelResultLabel === "unsafe" && geminiResultLabel === "unsafe") {
        overall_label = "unsafe";
      } else if (modelResultLabel === "safe" && geminiResultLabel === "safe") {
        overall_label = "safe";
      } else {
        overall_label = "human_review";
      }
    }

    // ------------------------------------------------------------------
    // FINAL LOG TO SUPABASE
    // ------------------------------------------------------------------
    await supabase.from('search_logs').insert([{
      raw_text: rawText,         // <-- What the user typed
      searched_text: text,       // <-- Cleaned text
      detected_language: finalDetectedLanguage,
      toxicity_result: overall_label
    }]);

	  return NextResponse.json<AnalysisResult>({
      overall_label,
      dictionary_match: false,
      model_result: final_model_result,
      gemini_result: geminiResultLabel,
      gemini_explanation: geminiResponse.explanation,
      detected_language: finalDetectedLanguage,
      ml_confidence: mlConfidence,
      ml_toxic_words: mlToxicWords,         // <-- 2. Send to frontend!
      gemini_confidence: geminiConfidence,
	  suggested_correction: geminiResponse.suggested_correction
    });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text" }, 
      { status: 500 }
    );
  }
}