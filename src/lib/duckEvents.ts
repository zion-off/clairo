export type DuckEvent =
  | 'pr:merged'
  | 'pr:opened'
  | 'pr:reviewed'
  | 'pr:approved'
  | 'pr:changes-requested'
  | 'error'
  | 'jira:transition'
  | 'jira:linked'
  | 'jira:configured';

type DuckEventListener = (event: DuckEvent) => void;

const listeners = new Set<DuckEventListener>();

export const duckEvents = {
  emit: (event: DuckEvent) => {
    listeners.forEach((fn) => fn(event));
  },
  subscribe: (fn: DuckEventListener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
};
