export type IssueCategory = 'Road' | 'Water' | 'Electricity' | 'Sanitation' | 'Other';

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';

export type PriorityBand = 'High' | 'Medium' | 'Low';

export interface TimelineEvent {
  from: IssueStatus | null;
  to: IssueStatus;
  note: string;
  at: string;
}

export interface PriorityBreakdown {
  urgencyPts: number;
  similarPts: number;
  agePts: number;
  ageDays: number;
}

export interface PublicIssueDetail {
  id: number;
  title: string;
  description: string;
  location: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  category: IssueCategory;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  timeline: TimelineEvent[];
}

export interface AdminIssueItem {
  id: number;
  title: string;
  description: string;
  location: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  category: IssueCategory;
  status: IssueStatus;
  priority: number;
  band: PriorityBand;
  urgency_hits: number;
  similar_count: number;
  age_days: number;
  breakdown: PriorityBreakdown;
  created_at: string;
  updated_at: string;
  timeline?: TimelineEvent[];
}

export interface StatsResponse {
  total: number;
  by_category: Record<IssueCategory, number>;
  by_status: Record<IssueStatus, number>;
  by_category_status: Record<IssueCategory, Record<IssueStatus, number>>;
  high_open: number;
  duplicate_clusters: number;
  classifier_accuracy: {
    correct: number;
    total: number;
    percentage: number;
  };
}

export interface TriagePreviewResponse {
  category: IssueCategory;
  confidence: number;
  matched_keywords: string[];
  urgency_hits: number;
  urgent_terms: string[];
  estimated_priority: number;
  estimated_band: PriorityBand;
  duplicates: Array<{
    id: number;
    title: string;
    location: string;
    status: IssueStatus;
    created_at: string;
  }>;
}

export interface NotificationPreview {
  sms: string;
  emailSubject: string;
  emailBody: string;
  generatedAt: string;
}
