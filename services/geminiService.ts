
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { InventoryItem } from "../types";

export class GeminiService {
  private static getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async chatWithInventory(
    message: string, 
    inventory: InventoryItem[], 
    history: {role: 'user' | 'model', text: string}[] = [],
    useThinking: boolean = false
  ): Promise<string> {
    const ai = this.getClient();
    const model = 'gemini-3-pro-preview';
    
    const inventoryContext = `Current Inventory: ${JSON.stringify(inventory)}`;
    const systemInstruction = `You are a professional kitchen management assistant. 
    You have access to the current inventory: ${inventoryContext}. 
    Answer questions about stock levels, recommend orders, or suggest recipes based on what's available.
    Be concise and professional.`;

    const config: any = {
      systemInstruction,
    };

    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config,
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  }

  static async analyzeKitchenImage(base64Image: string, mimeType: string): Promise<string> {
    const ai = this.getClient();
    const model = 'gemini-3-pro-preview';
    
    const prompt = `Analyze this image of a kitchen, pantry, or receipt. 
    If it's a receipt, list the items and quantities. 
    If it's a pantry/fridge photo, identify visible ingredients and estimate quantities.
    Return your analysis in a clear, bulleted format.`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      }
    });

    return response.text || "Analysis failed.";
  }

  static async suggestOrders(inventory: InventoryItem[]): Promise<string> {
    const ai = this.getClient();
    const model = 'gemini-3-pro-preview';
    
    const lowStock = inventory.filter(item => item.quantity <= item.minThreshold);
    
    const prompt = `Based on these low stock items: ${JSON.stringify(lowStock)}, 
    generate a suggested order list for my suppliers. Categorize them by food type.
    Use your 'thinking' capabilities to optimize for typical kitchen usage.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    return response.text || "Could not generate order suggestions.";
  }
}
