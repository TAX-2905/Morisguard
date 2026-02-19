// app/lib/schema.ts

export type OverallLabel = "safe" | "unsafe" | "human_review";

export interface AnalysisResult {
  overall_label: OverallLabel;
  
  // Layer 1: Dictionary
  dictionary_match: boolean;
  matched_words?: string[];
  
  // Layer 2: Custom Python ML Model
  model_result?: "safe" | "unsafe" | "skipped"; // Added 'skipped'
  
  // Layer 3: Gemini AI
  gemini_result?: "safe" | "unsafe";
  gemini_explanation?: string;
  
  // New: Language Tracker
  detected_language?: string;
}