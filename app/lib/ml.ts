// app/lib/ml.ts

export async function checkCustomModel(text: string): Promise<"safe" | "unsafe"> {
  try {
    // This sends the text to your Python FastAPI server
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    
    const data = await response.json();
    
    // Returns "unsafe" if the Python model outputs true, otherwise "safe"
    return data.is_toxic ? "unsafe" : "safe";
    
  } catch (error) {
    console.error("ML Model Error (Is the Python server running?):", error);
    return "safe"; // Failsafe
  }
}