import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChessAnalysisResponse {
  evaluation: string;
  bestMove: string;
  explanation: string;
  continuation: string[];
}

export async function analyzePosition(fen: string, history: string[]): Promise<ChessAnalysisResponse> {
  const prompt = `
    Analyze the current chess position given by this FEN: ${fen}
    History of moves: ${history.join(", ")}
    
    Provide a professional chess analysis in Vietnamese.
    The response must be in JSON format with the following fields:
    - evaluation: A brief assessment (e.g., "+1.5 White is slightly better", "Equal", "-3.0 Black is winning").
    - bestMove: The recommended best move in algebraic notation (e.g., "e4", "Nf3").
    - explanation: A detailed explanation of why this move is best and what the key ideas in the position are.
    - continuation: A list of 3-5 subsequent moves that might follow the best move.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluation: { type: Type.STRING },
            bestMove: { type: Type.STRING },
            explanation: { type: Type.STRING },
            continuation: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["evaluation", "bestMove", "explanation", "continuation"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as ChessAnalysisResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Không thể phân tích thế trận lúc này.");
  }
}
