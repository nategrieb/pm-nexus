export interface Project {
  id: number;
  name: string;
  status: string;
  target_date: string | null;
  created_at: string;
}

export interface ProjectDetail extends Project {
  epics: Epic[];
  documents: Document[];
  total_points: number;
  completed_points: number;
  engineer_ids: number[];
  forecast_weeks: number | null;
}

export interface Epic {
  id: number;
  epic_key: string;
  project_id: number;
  summary: string | null;
}

export interface Ticket {
  id: number;
  jira_key: string;
  epic_key: string | null;
  title: string;
  points: number | null;
  status: string;
  assignee_id: number | null;
  prd_link: string | null;
}

export interface Engineer {
  id: number;
  jira_account_id: string;
  name: string;
  location: string | null;
  weekly_hours: number;
  manual_tags: string[];
  auto_tags: string[];
}

export interface EngineerDetail extends Engineer {
  tickets: Ticket[];
}

export interface Document {
  id: number;
  project_id: number;
  doc_type: string;
  url: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface SettingsUpdate {
  jira_base_url: string;
  jira_email: string;
  jira_api_token: string;
  jira_story_points_field: string;
  unpointed_buffer: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface SyncResult {
  tickets_created: number;
  tickets_updated: number;
  engineers_created: number;
  errors: string[];
}

export interface ForecastResult {
  total_points: number;
  completed_points: number;
  remaining_points: number;
  unpointed_count: number;
  buffer_per_ticket: number;
  weekly_velocity: number | null;
  weeks_to_completion: number | null;
  calculated_end_date: string | null;
}

export interface GapAnalysisItem {
  jira_key: string;
  title: string;
  issue: string;
}
