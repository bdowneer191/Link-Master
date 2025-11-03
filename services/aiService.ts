// Create a NEW file: services/aiService.ts

import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the structured output we expect from the AI
export interface LinkPlanItem {
  anchor_text: string;
  destination_url: string;
  type: 'internal' | 'external';
  suggested_context: string; // The sentence where the link should be inserted
  confidence_score: number; // 0.0 - 1.0
}

export interface LinkPlan {
  plan: LinkPlanItem[];
}

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  // We enable the JSON output mode
  generationConfig: {
    responseMimeType: 'application/json',
  },
  systemInstruction: `You are an expert SEO content engineer. Your task is to analyze a piece of content and a list of candidate internal URLs. You must generate a "Link Plan" to strategically add internal links.

You will output ONLY a valid JSON object matching this exact schema:
{
  "plan": [
    {
      "anchor_text": "string",
      "destination_url": "string (must be from the candidate list)",
      "type": "internal",
      "suggested_context": "The full sentence from the original text where this link should be placed.",
      "confidence_score": Number (0.0 to 1.0, how confident you are about this link)
    }
  ]
}

Rules:
1.  Only suggest links where the anchor text is a natural phrase in the content.
2.  The "destination_url" MUST be one of the provided candidate URLs.
3.  Match the anchor text to the most semantically relevant candidate URL.
4.  Do NOT suggest linking to the article itself.
5.  Be conservative. Only suggest 2-3 high-quality links unless the text is very long.
6.  The "suggested_context" must be the exact, full sentence from the text.`,
});

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export const aiService = {
  /**
   * Analyzes content and creates a plan for internal linking.
   */
  generateLinkPlan: async (
    mainContent: string,
    candidateUrls: string[]
  ): Promise<LinkPlan> => {
    try {
      const prompt = `Here is the main text content:
---
${mainContent}
---

Here is the list of internal candidate URLs to link to:
---
${candidateUrls.join('\n')}
---

Generate the JSON link plan now.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const jsonText = response.text();

      // Parse and validate the JSON
      const parsed = JSON.parse(jsonText) as LinkPlan;
      if (!parsed.plan) {
        throw new Error('AI returned invalid JSON structure.');
      }

      return parsed;

    } catch (error: any) {
      console.error('Error in generateLinkPlan:', error);
      if (error.response) {
        console.error('AI Response Error:', error.response.promptFeedback);
      }
      throw new Error('Failed to generate link plan from AI.');
    }
  },
};
