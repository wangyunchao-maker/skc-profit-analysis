export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  type: string;
  level: ValidationLevel;
  message: string;
  fileName?: string;
  skcId?: string;
  month?: string;
}