export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDETERMINED';

export interface Indicator {
  type: string;
  title: string;
  description: string;
  evidence: string;
}

export interface MessageAnalysisRequest {
  message: string;
  shareInPanel?: boolean; // Sent only when the share checkbox is checked (US-3.3)
  sensitiveData?: string; // Comma-separated terms to hide; sent with shareInPanel
}

export interface EmailAnalysisRequest {
  emailContent: string; // Raw .eml file content, read as text (US-4.2)
}

export interface UrlAnalysisRequest {
  url: string; // One link as pasted by the user (US-6.2)
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  summary: string;
  explanation: string;
  indicators: Indicator[];
}

// US-7.1: chosen by the backend from a fixed catalog; never written by the AI.
export type RecommendationType =
  | 'do_not_follow'
  | 'do_not_share_data'
  | 'do_not_pay'
  | 'verify_official_channel'
  | 'do_not_open_link'
  | 'do_not_open_attachments'
  | 'take_your_time'
  | 'distrust_prizes'
  | 'if_already_acted'
  | 'stay_alert';

export interface Recommendation {
  type: RecommendationType;
  text: string; // Spanish text, set by the backend
}

export interface MessageAnalysisResponse {
  result: AnalysisResult;
  recommendations: Recommendation[]; // US-7.1: next to result, since AnalysisResult is also the model output shape
}

export type Topic =
  | 'family_money_request'
  | 'bank_impersonation'
  | 'credentials_request'
  | 'prize_or_giveaway'
  | 'package_delivery'
  | 'investment_offer'
  | 'job_offer'
  | 'other';

export interface CriticalMessage {
  id: number;
  text: string; // Masked text, never the original
  timesShared: number; // Times this message was shared (US-3.4); at least 1
}

export interface CriticalTopic {
  topic: Topic;
  title: string; // Spanish title, set by the backend
  timesShared: number; // Total times its messages were shared (US-3.4)
  messages: CriticalMessage[]; // Each message once, most recently shared first; never empty
}

export interface CriticalMessagesResponse {
  topics: CriticalTopic[]; // Most shared first; empty when nothing is stored
}
