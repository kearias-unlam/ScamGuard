export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Indicator {
  type: string;
  title: string;
  description: string;
}

export interface MessageAnalysisRequest {
  message: string;
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  summary: string;
  indicators: Indicator[];
}

export interface MessageAnalysisResponse {
  result: AnalysisResult;
}
