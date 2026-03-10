export interface Project {
  id: number;
  name: string;
  status: string;
  target_date: string | null;
  start_date: string | null;
  created_at: string;
  epic_count: number;
  ticket_count: number;
  total_points: number;
  completed_points: number;
  quarters: string[];
  dependencies: string[];
  forecast_end_date: string | null;
  forecast_weeks: number | null;
}

export interface Dependency {
  id: number;
  project_id: number;
  team_name: string;
}

export interface ProjectDetail extends Omit<Project, "dependencies"> {
  epics: Epic[];
  documents: Document[];
  dependencies: Dependency[];
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
  ticket_count: number;
  total_points: number;
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
  timezone: string | null;
  weekly_hours: number;
  manual_tags: string[];
  auto_tags: string[];
  is_active: boolean;
  ooo_start: string | null;
  ooo_end: string | null;
  sprint_capacity: number;
  current_project_id: number | null;
  role: string;
}

export interface EngineerDetail extends Engineer {
  tickets: Ticket[];
}

export interface Document {
  id: number;
  project_id: number;
  doc_type: string;
  url: string;
  title: string | null;
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
  jira_board_id: string;
  jira_project_key: string;
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

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
}

export interface JiraBoard {
  id: number;
  name: string;
}

export interface SprintTicket {
  jira_key: string;
  title: string;
  points: number | null;
  status: string;
  assignee_name: string | null;
  assignee_jira_account_id: string | null;
}

export interface EngineerSprintSummary {
  engineer_id: number;
  name: string;
  jira_account_id: string;
  sprint_capacity: number;
  rollover_points: number;
  assigned_points: number;
  available_points: number;
  tickets: SprintTicket[];
}

export interface SprintPlanningResponse {
  sprint: JiraSprint;
  engineers: EngineerSprintSummary[];
  unassigned_tickets: SprintTicket[];
  unassigned_points: number;
  unassigned_count: number;
  total_points: number;
}
