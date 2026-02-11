import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { generateViewName } from '../../lib/jira/url-parser';
import TextInput from '../ui/TextInput';

type Props = {
  onSubmit: (url: string, name: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
};

type Field = 'url' | 'name';

export default function AddViewModal({ onSubmit, onCancel, loading, error }: Props) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [activeField, setActiveField] = useState<Field>('url');

  const canSubmit = url.trim().length > 0;

  useInput(
    (_input, key) => {
      if (loading) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.tab) {
        setActiveField((f) => (f === 'url' ? 'name' : 'url'));
        return;
      }

      if (key.return && canSubmit) {
        const viewName = name.trim() || generateViewName(url.trim());
        onSubmit(url.trim(), viewName);
      }
    },
    { isActive: !loading }
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={1}>
      <Text bold color="yellow">
        Add Jira View
      </Text>
      <Text dimColor>Tab to switch fields, Enter to save, Esc to cancel</Text>
      <Box marginTop={1} />

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box>
        <Text color="blue">URL: </Text>
        <TextInput
          value={url}
          onChange={setUrl}
          placeholder="https://company.atlassian.net/issues/?filter=12345"
          isActive={!loading && activeField === 'url'}
        />
      </Box>

      <Box marginTop={1}>
        <Text color="blue">Name: </Text>
        <TextInput
          value={name}
          onChange={setName}
          placeholder="(auto-generated from URL)"
          isActive={!loading && activeField === 'name'}
        />
      </Box>

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">Validating view...</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Supports: filter URLs, JQL URLs, board URLs</Text>
      </Box>
    </Box>
  );
}
