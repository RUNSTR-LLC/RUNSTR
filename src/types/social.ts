// src/types/social.ts

export interface SocialFeedPost {
  id: string;
  event_id: string;
  npub: string;
  content: string;
  images: string[] | null;
  hashtags: string[] | null;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  indexed_at: string;
  like_count: number;
  repost_count: number;
  zap_total: number;
  liked_by: string[] | null;
  reposted_by: string[] | null;
  comment_count: number;
}

export interface SocialFeedZap {
  id: string;
  event_id: string;
  post_id: string;
  sender_npub: string;
  amount: number;
  created_at: string;
  indexed_at: string;
}

export interface SocialFeedComment {
  id: string;
  event_id: string;
  post_id: string;
  sender_npub: string;
  content: string;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  indexed_at: string;
}

/**
 * Format a timestamp as relative time.
 * < 1 min: "now", < 60 min: "Xm ago", < 24h: "Xh ago",
 * < 7d: "Xd ago", >= 7d: "Mon DD"
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const date = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
