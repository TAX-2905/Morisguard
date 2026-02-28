// app/lib/schema.ts

export type OverallLabel = "safe" | "unsafe" | "human_review";

export interface AnalysisResult {
  overall_label: OverallLabel;
  
  // Layer 1: Dictionary
  dictionary_match: boolean;
  matched_words?: string[];
  
  // Layer 2: Custom Python ML Model
  model_result?: "safe" | "unsafe" | "skipped"; 
  ml_confidence?: number;          // <-- NEW: Holds the ML percentage
  ml_toxic_words?: string[];       // <-- NEW: Holds the SHAP flagged words
  
  // Layer 3: Gemini AI
  gemini_result?: "safe" | "unsafe";
  gemini_confidence?: number;      // <-- NEW: Holds the Gemini percentage
  gemini_explanation?: string;
  suggested_correction?: string;
  
  // New: Language Tracker
  detected_language?: string;
}