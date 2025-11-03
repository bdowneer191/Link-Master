
import type { Credentials, WordPressPost, AllPosts } from '../types';

const getAuthHeader = (credentials: Credentials) => {
  const token = btoa(`${credentials.username}:${credentials.appPassword}`);
  return `Basic ${token}`;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
    throw new Error(`WordPress API Error: ${response.status} ${response.statusText} - ${errorData.message || 'No additional details'}`);
  }
  return response.json();
};

export const fetchPostBySlug = async (credentials: Credentials, slug: string): Promise<WordPressPost> => {
  const response = await fetch(`${credentials.siteUrl}/wp-json/wp/v2/posts?slug=${slug}&_fields=id,title,content,link`, {
    headers: {
      'Authorization': getAuthHeader(credentials),
    },
  });
  const posts = await handleResponse(response);
  if (posts.length === 0) {
    throw new Error(`Post with slug "${slug}" not found.`);
  }
  return posts[0];
};

export const fetchAllPublishedPosts = async (credentials: Credentials): Promise<AllPosts[]> => {
    let allPosts: AllPosts[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by WordPress API is 100

    while (true) {
        const response = await fetch(`${credentials.siteUrl}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&status=publish&_fields=title,link`, {
             headers: {
                'Authorization': getAuthHeader(credentials),
            },
        });

        if (!response.ok) {
          if (response.status === 400) {
            break;
          }
          const errorText = await response.text();
          throw new Error(`WordPress API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const posts: any[] = await response.json();

        if (posts.length === 0) {
          break;
        }

        allPosts = allPosts.concat(posts.map((p: any) => ({title: p.title.rendered, url: p.link})));
        page++;
    }
    return allPosts;
}


export const updatePost = async (credentials: Credentials, postId: number, content: string): Promise<WordPressPost> => {
  const response = await fetch(`${credentials.siteUrl}/wp-json/wp/v2/posts/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  return handleResponse(response);
};
