import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import {
  applyTransition,
  getJiraCredentials,
  getJiraSiteUrl,
  getTransitions,
  JiraAuth,
  JiraTransition,
} from '../../lib/jira/index.js';

type Props = {
  repoPath: string;
  ticketKey: string;
  currentStatus: string;
  onComplete: (newStatus: string) => void;
  onCancel: () => void;
};

export default function ChangeStatusModal({ repoPath, ticketKey, currentStatus, onComplete, onCancel }: Props) {
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransitions = async () => {
      const siteUrl = getJiraSiteUrl(repoPath);
      const creds = getJiraCredentials(repoPath);

      if (!siteUrl || !creds.email || !creds.apiToken) {
        setError('Jira not configured');
        setLoading(false);
        return;
      }

      const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };
      const result = await getTransitions(auth, ticketKey);

      if (result.success) {
        setTransitions(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchTransitions();
  }, [repoPath, ticketKey]);

  const handleSelect = async (item: { value: string; label: string }) => {
    setApplying(true);
    setError(null);

    const siteUrl = getJiraSiteUrl(repoPath);
    const creds = getJiraCredentials(repoPath);

    if (!siteUrl || !creds.email || !creds.apiToken) {
      setError('Jira not configured');
      setApplying(false);
      return;
    }

    const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };
    const result = await applyTransition(auth, ticketKey, item.value);

    if (result.success) {
      // Find the transition to get the target status name
      const transition = transitions.find((t) => t.id === item.value);
      const newStatus = transition?.to.name ?? item.label;
      onComplete(newStatus);
    } else {
      setError(result.error);
      setApplying(false);
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape && !applying) {
        onCancel();
      }
    },
    { isActive: !applying }
  );

  const items = transitions.map((t) => ({
    label: t.name,
    value: t.id,
  }));

  // Find initial index based on current status (match transition target)
  const initialIndex = Math.max(0, transitions.findIndex((t) => t.to.name === currentStatus));

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={1}>
      <Text bold color="yellow">
        Change Status: {ticketKey}
      </Text>

      {loading && <Text dimColor>Loading transitions...</Text>}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {!loading && !error && transitions.length === 0 && (
        <Text dimColor>No available transitions</Text>
      )}

      {!loading && !error && transitions.length > 0 && !applying && (
        <Box marginTop={1} flexDirection="column">
          <SelectInput items={items} initialIndex={initialIndex} onSelect={handleSelect} />
        </Box>
      )}

      {applying && (
        <Box marginTop={1}>
          <Text color="yellow">Updating status...</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Esc to cancel</Text>
      </Box>
    </Box>
  );
}
