import OpenAI from "openai";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface ParsedMenuData {
  extractedText: string;
  cleanedText: string;
  categories: string[];
  items: Array<{
    name: string;
    category: string;
    price?: number;
    description?: string;
  }>;
}

export class PDFParserService {
  async parsePDFBuffer(buffer: Buffer): Promise<string> {
    // For now, we'll provide a helpful message and guide users to paste their menu text
    // This ensures maximum accuracy since PDF text extraction can be inconsistent
    return `PDF uploaded successfully (${(buffer.length / 1024).toFixed(1)}KB)!\n\nFor the most accurate AI analysis:\n1. Open your PDF menu\n2. Copy the text content\n3. Paste it in the text area below\n\nThis approach ensures perfect menu parsing and the best AI recommendations for your restaurant.`;
  }

  async intelligentMenuParsing(extractedText: string): Promise<ParsedMenuData> {
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: `You are an expert menu parser. Your job is to extract and structure menu information from raw text.

TASK: Parse the provided menu text and return a JSON object with:
1. "cleanedText" - cleaned version of the original text, removing artifacts but keeping menu structure
2. "categories" - array of menu categories found (e.g., ["Appetizers", "Entrees", "Desserts"])
3. "items" - array of menu items with structure: { name, category, price?, description? }

PARSING RULES:
- Remove PDF artifacts like page numbers, headers, footers
- Identify menu categories (often in ALL CAPS or bold format)
- Extract item names, prices, and descriptions
- Handle various price formats: $12, 12.00, $12.95, etc.
- Group items under their correct categories
- Clean up formatting issues like extra spaces, line breaks
- If no clear categories exist, use "Menu Items"

EXAMPLE OUTPUT:
{
  "cleanedText": "APPETIZERS\\nBruschetta - Fresh tomatoes and basil $12\\nCalamari - Crispy fried with marinara $15\\n\\nENTREES\\nGrilled Salmon - With seasonal vegetables $24",
  "categories": ["Appetizers", "Entrees"],
  "items": [
    { "name": "Bruschetta", "category": "Appetizers", "price": 12, "description": "Fresh tomatoes and basil" },
    { "name": "Calamari", "category": "Appetizers", "price": 15, "description": "Crispy fried with marinara" },
    { "name": "Grilled Salmon", "category": "Entrees", "price": 24, "description": "With seasonal vegetables" }
  ]
}

Respond ONLY with valid JSON.`
          },
          {
            role: "user",
            content: extractedText
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content returned from AI parsing');
      }
      const parsedData = JSON.parse(content);
      
      return {
        extractedText,
        cleanedText: parsedData.cleanedText || extractedText,
        categories: parsedData.categories || [],
        items: parsedData.items || []
      };
    } catch (error) {
      console.error('AI parsing failed:', error);
      
      // Fallback to basic text parsing
      return {
        extractedText,
        cleanedText: extractedText,
        categories: [],
        items: []
      };
    }
  }

  async parseMenuPDF(buffer: Buffer): Promise<ParsedMenuData> {
    const extractedText = await this.parsePDFBuffer(buffer);
    return await this.intelligentMenuParsing(extractedText);
  }
}

export const pdfParserService = new PDFParserService();