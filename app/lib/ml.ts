// app/lib/ml.ts

// Fallback to localhost if the environment variable isn't set
const ML_API_URL = process.env.PYTHON_ML_API_URL || "http://127.0.0.1:8000";

export async function checkCustomModel(text: string): Promise<"safe" | "unsafe"> {
  try {
    // Combine the base URL with your /predict endpoint
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    
    const data = await response.json();
    return data.is_toxic ? "unsafe" : "safe";
    
  } catch (error) {
    console.error("ML Model Error:", error);
    return "safe"; 
  }
}