import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from '../ui/TextInput';

type Props = {
  onSubmit: (ticketInput: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
};

export default function LinkTicketModal({ onSubmit, onCancel, loading, error }: Props) {
  const [ticketInput, setTicketInput] = useState('');

  const canSubmit = ticketInput.trim().length > 0;

  useInput(
    (_input, key) => {
      if (loading) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return && canSubmit) {
        onSubmit(ticketInput.trim());
      }
    },
    { isActive: !loading }
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={1}>
      <Text bold color="yellow">
        Link Jira Ticket
      </Text>
      <Text dimColor>Type ticket ID, Enter to submit, Esc to cancel</Text>
      <Box marginTop={1} />

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box>
        <Text color="blue">Ticket: </Text>
        <TextInput value={ticketInput} onChange={setTicketInput} placeholder="PROJ-123" isActive={!loading} />
      </Box>

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">Fetching ticket...</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Examples: PROJ-123 or https://company.atlassian.net/browse/PROJ-123</Text>
      </Box>
    </Box>
  );
}
