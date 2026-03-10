export type OverallLabel = "safe" | "unsafe" | "human_review";

export interface AnalysisResult {
  overall_label: OverallLabel;
  
  dictionary_match: boolean;
  matched_words?: string[];
  
  model_result?: "safe" | "unsafe" | "skipped"; 
  ml_confidence?: number;          // <-- Holds the ML percentage
  ml_toxic_words?: string[];       // <-- Holds the SHAP flagged words
  
  gemini_result?: "safe" | "unsafe";
  gemini_confidence?: number;      // <-- Holds the Gemini percentage
  gemini_explanation?: string;
  suggested_correction?: string;
  
  detected_language?: string;
}

