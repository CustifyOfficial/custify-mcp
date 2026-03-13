export interface Company {
  id: string;
  company_id?: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  size?: string;
  plan?: string;
  mrr?: number;
  arr?: number;
  ltv?: number;
  churn_risk?: number;
  lifecycle_stage?: string;
  signed_up_at?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  trial_end_date?: string;
  renewal_date?: string;
  owners_csm?: string;
  owners_csm_name?: string;
  tags?: string[];
  buckets?: string[];
  custom_attributes?: Record<string, unknown>;
  metrics?: {
    health_scores?: {
      global?: HealthScoreEntry;
      [key: string]: HealthScoreEntry | undefined;
    };
    [key: string]: unknown;
  };
  people_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HealthScoreEntry {
  value: number;
  label?: string;
  color?: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  customer_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  title?: string;
  role?: string;
  company?: string;
  company_id?: string;
  avatar_url?: string;
  signed_up_at?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  tags?: string[];
  custom_attributes?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface HealthScoreDefinition {
  id: string;
  name: string;
  description?: string;
  type?: string;
  weight?: number;
  ranges?: HealthScoreRange[];
  created_at?: string;
  updated_at?: string;
}

export interface HealthScoreRange {
  label: string;
  color: string;
  min: number;
  max: number;
}

export interface HealthScoreValue {
  id: string;
  health_score_id: string;
  company_id: string;
  value: number;
  label?: string;
  color?: string;
  date: string;
  created_at?: string;
}

export interface UsageData {
  event_name: string;
  count?: number;
  frequency?: number;
  last_occurrence?: string;
  data?: unknown[];
}

export interface Alert {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  severity?: string;
  entity?: string;
  entity_model?: string;
  entity_name?: string;
  signal_id?: string;
  acknowledged?: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  type?: string;
  color?: string;
  companies_count?: number;
  filters?: unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  trigger?: unknown;
  actions?: unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface Note {
  id: string;
  entity: string;
  entity_model: string;
  content: string;
  subject?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  metadata: {
    title: string;
    entity: string;
    entity_model: string;
    due_date?: string;
    priority?: string;
    assignees?: string[];
    description?: string;
  };
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data?: T[];
  items?: T[];
  companies?: T[];
  signals?: T[];
  people?: T[];
  segments?: T[];
  playbooks?: T[];
  values?: T[];
  total?: number;
  page?: number;
  pages?: number;
  itemsPerPage?: number;
  hasMore?: boolean;
  average?: number;
  min?: number;
  max?: number;
  median?: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
