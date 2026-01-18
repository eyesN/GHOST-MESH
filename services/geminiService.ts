import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartReply = async (
  conversationHistory: string[],
  lastMessage: string
): Promise<string> => {
  if (!process.env.API_KEY) return "AI Offline (No API Key)";

  try {
    const prompt = `
      You are a secure AI assistant within a private mesh network messaging app called GhostMesh.
      The user has received a message: "${lastMessage}".
      Context: ${conversationHistory.slice(-5).join('\n')}
      
      Generate a short, concise, and helpful reply suggestion or answer. 
      Keep it under 20 words. Tone: Cyberpunk, efficient, secure.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, privacy-focused AI assistant.",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Encryption error...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Signal interference detected.";
  }
};

export const analyzeSecurity = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) return "Security Module Offline";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this text for potential security risks or sensitive data leaks: "${text}". Return a 1 sentence assessment.`,
    });
    return response.text || "Analysis failed.";
  } catch (e) {
    return "Analysis unavailable.";
  }
};