export type DuckEvent =
  | 'pr:merged'
  | 'pr:opened'
  | 'pr:reviewed'
  | 'pr:approved'
  | 'pr:changes-requested'
  | 'error'
  | 'jira:transition'
  | 'jira:linked'
  | 'jira:configured'
  | 'jira:assigned'
  | 'jira:unassigned';

export type DuckEventPayload = {
  prNumber?: number;
  prTitle?: string;
  ticketKey?: string;
  status?: string;
  assignee?: string;
};

type DuckEventListener = (event: DuckEvent, payload?: DuckEventPayload) => void;

const listeners = new Set<DuckEventListener>();

export const duckEvents = {
  emit: (event: DuckEvent, payload?: DuckEventPayload) => {
    listeners.forEach((fn) => fn(event, payload));
  },
  subscribe: (fn: DuckEventListener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
};
