
export interface Credentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export type PostStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface PostURL {
  url: string;
  status: PostStatus;
  message: string;
}

export interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  link: string;
}

export interface AllPosts {
    title: string;
    url: string;
}

export interface Link {
  anchor_text: string;
  url: string;
}

export interface LinkPlan {
  links_to_add: Link[];
}

export interface ProcessingLog {
  postUrl: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
