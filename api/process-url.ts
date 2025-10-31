
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { fetchPostBySlug, updatePost, fetchAllPublishedPosts } from '../services/wordpressService';
import type { Credentials, LinkPlan } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { postUrl, credentials } = req.body as { postUrl: string; credentials: Credentials };

        if (!postUrl || !credentials) {
            return res.status(400).json({ error: 'Missing postUrl or credentials in request body' });
        }

        const slug = postUrl.split('/').filter(Boolean).pop();
        if (!slug) {
            return res.status(400).json({ error: 'Could not extract slug from URL.' });
        }

        const post = await fetchPostBySlug(credentials, slug);
        const allPosts = await fetchAllPublishedPosts(credentials);
        const internalLinkCandidates = allPosts
            .filter(p => p.url !== post.link)
            .map(p => ({ title: p.title, url: p.url }));

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

        const plainText = post.content.rendered.replace(/<[^>]+>/g, '').replace(/\s\s+/g, ' ').trim();
        const wordCount = plainText.split(/\s+/).length;
        const internalLinksNeeded = Math.ceil(wordCount / 120);
        const externalLinksNeeded = Math.ceil(wordCount / 200);

        const analysisPrompt = `
You are an SEO expert. Your task is to create a strategic linking plan for a blog post.
Analyze the provided article content and create a JSON object containing links to add.
Instructions:
1.  Identify exactly ${internalLinksNeeded} phrases in the article content to use as anchor text for INTERNAL links.
2.  For each internal anchor text, select the most relevant URL from the provided list of internal link candidates. The anchor text must be an EXACT match to a phrase in the article.
3.  Identify exactly ${externalLinksNeeded} phrases in the article content to use as anchor text for EXTERNAL links. For these, you will suggest a highly authoritative, relevant external URL (e.g., from Wikipedia, a major news source, or an industry leader). The anchor text must be an EXACT match to a phrase in the article.
4.  Return ONLY a valid JSON object that adheres to the provided schema. Do not include any explanatory text before or after the JSON.
Article Content (Plain Text):
---
${plainText.substring(0, 30000)}
---
Internal Link Candidates (Title and URL):
---
${JSON.stringify(internalLinkCandidates.slice(0, 100))}
---
        `;

        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        links_to_add: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    anchor_text: { type: Type.STRING },
                                    url: { type: Type.STRING },
                                },
                                required: ["anchor_text", "url"]
                            }
                        }
                    },
                    required: ["links_to_add"]
                }
            }
        });

        const linkPlan: LinkPlan = JSON.parse(analysisResponse.text);

        if (linkPlan.links_to_add.length === 0) {
            return res.status(200).json({ message: 'No new links to add. Marking as complete.' });
        }

        const enhancementPrompt = `
You are an expert HTML editor. Your task is to insert hyperlinks into an existing HTML document based on a provided JSON plan.
Instructions:
1.  Carefully examine the 'Original HTML'.
2.  For each item in the 'Link Strategy', find the EXACT 'anchor_text' within the HTML content.
3.  Wrap the FIRST occurrence of that exact anchor text with an \`<a>\` tag using the provided 'url'.
4.  If the URL is an internal link (starts with "${credentials.siteUrl}"), add \`rel=""\`.
5.  If the URL is an external link, add \`target="_blank" rel="noopener noreferrer"\`.
6.  It is CRITICAL that you do not alter any other part of the HTML. Preserve all existing tags, classes, and structures.
7.  Return ONLY the raw, complete, modified HTML content. Do not wrap it in markdown backticks or add any other text.
Link Strategy (JSON):
---
${JSON.stringify(linkPlan.links_to_add)}
---
Original HTML:
---
${post.content.rendered}
---
`;

        const enhancementResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: enhancementPrompt,
        });

        const enhancedHtml = enhancementResponse.text.trim();

        await updatePost(credentials, post.id, enhancedHtml);

        res.status(200).json({ message: `Successfully added ${linkPlan.links_to_add.length} links.` });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
    }
}
