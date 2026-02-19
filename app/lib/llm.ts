// app/lib/llm.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeminiResult {
  is_toxic: boolean;
  explanation: string;
  detected_language: string; 
}

export async function checkGemini(text: string): Promise<GeminiResult> {
  try {
// Replace your current model initialization with this:
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash", 
  generationConfig: {
    temperature: 0,
    responseMimeType: "application/json",
  }
});
    
    const prompt = `
    You are an expert content moderator for Mauritian Creole, French, and English.
    Analyze the following phrase and determine if it is toxic, offensive, hate speech, or safe.
    
    CRITICAL INSTRUCTIONS:
    1. Identify the DOMINANT language based on the majority of the words used. Use strictly one of these values: "creole", "french", or "english". 
       IMPORTANT RULE: If the text is clearly English, classify as "english". If it is clearly French, classify as "french". 
       DEFAULT RULE: If the language is not clearly French or English, or if it is a mixture of languages containing any Mauritian Creole words/slang, you MUST classify it as "creole".
    2. DO NOT repeat the original text.
    3. DO NOT translate the text.
    4. Keep the explanation concise (1-2 sentences maximum).
    5. The explanation MUST be written exclusively in ENGLISH. NEVER use French or Creole for the explanation.
    
    Text to analyze: "${text}"
    
    Respond ONLY in valid JSON format matching this exact structure:
    {
      "detected_language": "creole",
      "is_toxic": true or false,
      "explanation": "Your concise explanation here IN ENGLISH ONLY (or empty string if safe)"
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?|```/g, "").trim();
    const aiAnalysis = JSON.parse(responseText);

    return {
      is_toxic: !!aiAnalysis.is_toxic,
      explanation: aiAnalysis.explanation || "",
      detected_language: aiAnalysis.detected_language || "unknown"
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { is_toxic: false, explanation: "", detected_language: "unknown" };
  }
}