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

export interface AnalysisResult {
  riskLevel: RiskLevel;
  summary: string;
  explanation: string;
  indicators: Indicator[];
}

export interface MessageAnalysisResponse {
  result: AnalysisResult;
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
