// app/lib/ml.ts

// Fallback to localhost if the environment variable isn't set
const ML_API_URL = process.env.PYTHON_ML_API_URL || "http://127.0.0.1:8000";

// 1. Define the new return type so TypeScript knows what to expect
export interface MLModelResult {
  label: "safe" | "unsafe";
  confidence: number;
  toxic_words: string[]; // <-- ADD THIS
}

export async function checkCustomModel(text: string): Promise<MLModelResult> {
  try {
    // Combine the base URL with your /predict endpoint
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`ML API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 2. Extract the score. 
    // This handles it whether your Python API calls it 'score' or 'confidence'
    const rawScore = data.score !== undefined ? data.score : (data.confidence || 0);
    
    // 3. Convert to a neat percentage (e.g., 0.985 becomes 99)
    // If your Python API already sends 98 instead of 0.98, this handles that too.
    const confidencePercent = rawScore <= 1.0 ? Math.round(rawScore * 100) : Math.round(rawScore);

	  return {
      label: data.is_toxic ? "unsafe" : "safe",
      confidence: confidencePercent,
      toxic_words: data.toxic_words || [] // <-- ADD THIS (Catches the array or defaults to empty)
    };
    
  } catch (error) {
    console.error("ML Model Error:", error);
    // 4. Safe fallback if the Python server is offline or fails
    return {
      label: "safe",
      confidence: 0 
    }; 
  }
}