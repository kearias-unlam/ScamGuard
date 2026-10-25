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
}

export interface CriticalTopic {
  topic: Topic;
  title: string; // Spanish title, set by the backend
  messages: CriticalMessage[]; // Newest first; never empty
}

export interface CriticalMessagesResponse {
  topics: CriticalTopic[]; // Most messages first; empty when nothing is stored
}
