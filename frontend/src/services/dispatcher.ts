import { apiFetch } from './http';

export interface DispatcherStatus {
  enabled: boolean;
  mode: string;
  hard_cap: number;
  max_rounds: number;
  planner_model: string;
  debug_feedback: boolean;
  last_updated: string;
}

export interface SelectedAgent {
  agent_id: number;
  priority: number;
  reason_tag: string;
}

export interface ExecutionStage {
  stage: number;
  mode: string;
  agents: number[];
}

export interface RoundControl {
  max_rounds: number;
  trigger_next_round: boolean;
  next_round_candidates: number[];
}

export interface DispatchPlan {
  plan_id: string;
  conversation_id: number;
  trigger_message_id: number;
  selected_agents: SelectedAgent[];
  execution_graph: ExecutionStage[];
  round_control: RoundControl;
  deferred_candidates: number[];
}

export interface DispatchLog {
  event: string;
  tenant_id: string;
  conversation_id: number;
  message_id: number;
  request_id: string;
  planner_model: string;
  failure_type?: string;
  retry_count: number;
  fallback_strategy?: string;
  selected_agents: number[];
  latency_ms: number;
  timestamp: string;
}

export interface DispatcherSummary {
  conversation_id: number;
  message_id: number;
  selected_agents: number[];
  fallback: boolean;
  failure_type?: string;
  retry_count: number;
  latency_ms: number;
  context: {
    raw_content: string;
    cleaned_content: string;
    active_agent_ids: number[];
    mentioned_ids: number[];
    missing_mentioned_ids: number[];
    is_group: boolean;
  };
  plan: DispatchPlan;
  planner_output_preview: string;
}

export async function getDispatcherStatus(): Promise<DispatcherStatus> {
  const response = await apiFetch('/api/v1/dispatcher/status');
  if (!response.ok) {
    throw new Error('Failed to fetch dispatcher status');
  }
  return response.json();
}

export async function getDispatcherPlans(limit = 50): Promise<DispatchPlan[]> {
  const response = await apiFetch(`/api/v1/dispatcher/plans?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dispatcher plans');
  }
  return response.json();
}

export async function getDispatcherLogs(limit = 100): Promise<DispatchLog[]> {
  const response = await apiFetch(`/api/v1/dispatcher/logs?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dispatcher logs');
  }
  return response.json();
}

export async function getDispatcherSummaries(
  conversationId?: number,
  limit = 50,
): Promise<DispatcherSummary[]> {
  const params = new URLSearchParams();
  if (conversationId !== undefined) {
    params.set('conversation_id', conversationId.toString());
  }
  params.set('limit', limit.toString());
  
  const response = await apiFetch(`/api/v1/dispatcher/summaries?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dispatcher summaries');
  }
  return response.json();
}