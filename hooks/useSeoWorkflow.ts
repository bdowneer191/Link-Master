import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { fetchPostBySlug, updatePost, fetchAllPublishedPosts } from '../services/wordpressService';
import type { Credentials, ProcessingLog, LinkPlan, AllPosts } from '../types';

export const useSeoWorkflow = (credentials: Credentials) => {
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<ProcessingLog | null>(null);

  const addLog = useCallback((postUrl: string, message: string, type: 'info' | 'success' | 'error') => {
    setLog({ postUrl, message, type });
  }, []);

  const processUrl = useCallback(async (postUrl: string) => {
    setIsLoading(true);
    addLog(postUrl, 'Workflow started.', 'info');

    try {
      // 1. Fetch Post Data from WordPress
      const slug = postUrl.split('/').filter(Boolean).pop();
      if (!slug) throw new Error('Could not extract slug from URL.');
      addLog(postUrl, `Extracted slug: ${slug}`, 'info');

      const post = await fetchPostBySlug(credentials, slug);
      addLog(postUrl, `Fetched post: "${post.title.rendered}"`, 'info');

      // 2. Fetch all other posts for internal linking candidates
      addLog(postUrl, 'Fetching all published posts for internal link candidates...', 'info');
      const allPosts = await fetchAllPublishedPosts(credentials);
      // Fix: Correctly access properties 'url' and 'title' from the 'AllPosts' type.
      const internalLinkCandidates = allPosts
        .filter(p => p.url !== post.link)
        .map(p => ({ title: p.title, url: p.url }));
      addLog(postUrl, `Found ${internalLinkCandidates.length} potential internal links.`, 'info');

      // 3. Analyze content and create link plan with Gemini
      addLog(postUrl, 'Sending content to Gemini for analysis and link planning...', 'info');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const plainText = post.content.rendered.replace(/<[^>]+>/g, '').replace(/\s\s+/g, ' ').trim();
      const wordCount = plainText.split(/\s+/).length;
      const internalLinksNeeded = Math.ceil(wordCount / 120); // 1 internal link per 120 words
      const externalLinksNeeded = Math.ceil(wordCount / 200); // 1 external link per 200 words

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
      addLog(postUrl, `Gemini created a plan to add ${linkPlan.links_to_add.length} links.`, 'info');

      // 4. Send linking plan to Gemini to enhance HTML
      if (linkPlan.links_to_add.length === 0) {
        addLog(postUrl, 'No new links to add. Marking as complete.', 'success');
        setIsLoading(false);
        return 'No new links were needed.';
      }

      addLog(postUrl, 'Sending link plan to Gemini for HTML enhancement...', 'info'); 
      
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
        model: 'gemini-2.5-pro', // Use a more powerful model for precise HTML editing
        contents: enhancementPrompt,
      });

      const enhancedHtml = enhancementResponse.text.trim();
      addLog(postUrl, 'Successfully generated enhanced HTML.', 'info');

      // 5. Update WordPress Post
      addLog(postUrl, 'Updating post in WordPress...', 'info');
      await updatePost(credentials, post.id, enhancedHtml);
      addLog(postUrl, 'Post successfully updated!', 'success');

      setIsLoading(false);
      return `Successfully added ${linkPlan.links_to_add.length} links.`;
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(postUrl, `Error: ${errorMessage}`, 'error');
      setIsLoading(false);
      throw error;
    }
  }, [credentials, addLog]);

  return { processUrl, isLoading, log };
};