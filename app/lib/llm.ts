// app/lib/llm.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 1. Updated interface to include confidence_score
export interface GeminiResult {
  is_toxic: boolean;
  explanation: string;
  detected_language: string;
  confidence_score: number; // <-- Added this
  suggested_correction: string;
}

export async function checkGemini(text: string): Promise<GeminiResult> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", // Note: Ensure you are using a valid model name like gemini-2.0-flash
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      }
    });
    
const prompt = `
    You are an expert content moderator for Mauritian Creole, French, and English.
    Analyze the following phrase and determine if it is toxic, offensive, hate speech, or safe.
    
    CRITICAL INSTRUCTIONS:
    1. Identify all languages used in the text. Use strictly these values: "creole", "french", "english". 
       IMPORTANT RULE: If multiple languages are mixed, return them as a comma-separated string.
    2. DO NOT repeat the original text in the explanation.
    3. DO NOT translate the text.
    4. Keep the explanation concise (1-2 sentences maximum).
    5. The explanation MUST be written exclusively in ENGLISH.
    6. Calculate a strict confidence score from 0 to 100.
    
	7. SUGGESTED CORRECTION RULES:
       - FIX LOGIC & AUTOCORRECT FAILS: If a word breaks the meaning of the sentence (e.g., replacing "fois" with "lor" or "dan" in "Met li fois dernier baro"), you MUST fix it so the sentence makes sense.
       - PRESERVE SLANG & SMS: Do NOT "clean up" Mauritian internet abbreviations. Keep words like "p", "ggn", "criz", "ct", and "baro" exactly as the user typed them.
       - NO FRENCHIFICATION: Do NOT add French accents (é, à, è) and do NOT change informal Creole spelling into formal French (e.g., keep "ete", do not change to "été").
       - RETURN EMPTY IF READABLE: If the sentence is highly informal but still logically makes sense to a Mauritian on Facebook, return an empty string "". ONLY suggest a correction if the logic or grammar is genuinely broken.

    Text to analyze: "${text}"
    
    Respond ONLY in valid JSON format matching this exact structure:
    {
      "detected_language": "creole, english", 
      "is_toxic": true or false,
      "confidence_score": 88, 
      "explanation": "Your concise explanation here",
      "suggested_correction": "Fixed Creole part + untouched English/French part"
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?|```/g, "").trim();
    const aiAnalysis = JSON.parse(responseText);

    // 2. Map the AI response fields to the return object correctly
	  return {
      is_toxic: !!aiAnalysis.is_toxic,
      explanation: aiAnalysis.explanation || "",
      detected_language: aiAnalysis.detected_language || "creole",
      confidence_score: aiAnalysis.confidence_score || 0,
      suggested_correction: aiAnalysis.suggested_correction || "" // <-- NEW
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      is_toxic: false, 
      explanation: "Error connecting to AI.", 
      detected_language: "unknown",
      confidence_score: 0, 
	  suggested_correction: ""
    };
  }
}