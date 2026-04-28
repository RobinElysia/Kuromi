export interface Post {
  id: number;
  author: string;
  title?: string;
  tags?: string[];
  content: string;
  viewCount?: number;
  imageUrl?: string;
  hasImage?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: string;
  comments: CommentItem[];
}

export interface User {
  username: string;
  role: "admin" | "guest";
}

export interface CommentItem {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface MessageItem {
  id: number;
  author: string;
  content: string;
  createdAt: string;
}
