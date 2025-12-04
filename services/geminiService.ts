import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScoreData, FruitType, SenseiWisdom } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSenseiWisdom = async (data: ScoreData): Promise<SenseiWisdom> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `
    The player has finished a game of Zen Fruit Ninja.
    Score: ${data.score}
    Fruits Sliced: ${JSON.stringify(data.fruitsSliced)}
    Max Combo: ${data.comboMax}
    
    You are an ancient Fruit Ninja Sensei. 
    1. Assign them a Rank (e.g., "Kitchen Novice", "Fruit Samurai", "Juice Shogun").
    2. Write a short, mystical, but humorous Haiku or proverb about their performance.
    3. Give a one-sentence analysis of their cutting style based on the fruits (e.g., "You prefer the sour tang of lemons...").
    
    If they hit a bomb (implied if score is low but many fruits sliced, or if score is 0), scold them gently.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      rank: { type: Type.STRING },
      quote: { type: Type.STRING },
      analysis: { type: Type.STRING }
    },
    required: ["rank", "quote", "analysis"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a wise and slightly humorous Ninja Master.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Sensei");

    return JSON.parse(text) as SenseiWisdom;
  } catch (error) {
    console.error("Sensei is meditating (Error):", error);
    return {
      rank: "Unknown Ronin",
      quote: "The cloud is foggy.\nTry again later.",
      analysis: "Sensei could not analyze your skills."
    };
  }
};
