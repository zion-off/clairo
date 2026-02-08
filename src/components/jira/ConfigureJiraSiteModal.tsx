import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { openInEditor } from '../../lib/editor.js';

type Props = {
  initialSiteUrl?: string;
  initialEmail?: string;
  onSubmit: (siteUrl: string, email: string, apiToken: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
};

type SelectedItem = 'siteUrl' | 'email' | 'apiToken' | 'submit';

export default function ConfigureJiraSiteModal({
  initialSiteUrl,
  initialEmail,
  onSubmit,
  onCancel,
  loading,
  error
}: Props) {
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [apiToken, setApiToken] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>('siteUrl');

  const items: SelectedItem[] = ['siteUrl', 'email', 'apiToken', 'submit'];

  const canSubmit = siteUrl.trim() && email.trim() && apiToken.trim();

  useInput(
    (input, key) => {
      if (loading) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.upArrow || input === 'k') {
        setSelectedItem((prev) => {
          const idx = items.indexOf(prev);
          return items[Math.max(0, idx - 1)];
        });
        return;
      }

      if (key.downArrow || input === 'j') {
        setSelectedItem((prev) => {
          const idx = items.indexOf(prev);
          return items[Math.min(items.length - 1, idx + 1)];
        });
        return;
      }

      if (key.return) {
        if (selectedItem === 'siteUrl') {
          const newValue = openInEditor(siteUrl, 'JIRA_SITE_URL.txt');
          if (newValue !== null) {
            setSiteUrl(newValue.split('\n')[0].trim());
          }
        } else if (selectedItem === 'email') {
          const newValue = openInEditor(email, 'JIRA_EMAIL.txt');
          if (newValue !== null) {
            setEmail(newValue.split('\n')[0].trim());
          }
        } else if (selectedItem === 'apiToken') {
          const newValue = openInEditor(apiToken, 'JIRA_API_TOKEN.txt');
          if (newValue !== null) {
            setApiToken(newValue.split('\n')[0].trim());
          }
        } else if (selectedItem === 'submit' && canSubmit) {
          onSubmit(siteUrl.trim(), email.trim(), apiToken.trim());
        }
      }
    },
    { isActive: !loading }
  );

  const renderItem = (item: SelectedItem, label: string, value?: string, isSensitive?: boolean) => {
    const isSelected = selectedItem === item;
    const prefix = isSelected ? '> ' : '  ';
    const color = isSelected ? 'yellow' : undefined;

    const displayValue = isSensitive && value ? '*'.repeat(Math.min(value.length, 20)) : value;

    return (
      <Box flexDirection="column">
        <Text color={color} bold={isSelected}>
          {prefix}
          {label}
        </Text>
        {value !== undefined && (
          <Box marginLeft={4}>
            <Text dimColor>{displayValue || '(empty - press Enter to edit)'}</Text>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        Configure Jira Site
      </Text>
      <Text dimColor>Up/Down to select, Enter to edit, Esc to cancel</Text>
      <Box marginTop={1} />

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {renderItem('siteUrl', 'Site URL (e.g., https://company.atlassian.net)', siteUrl)}
      <Box marginTop={1} />
      {renderItem('email', 'Email', email)}
      <Box marginTop={1} />
      {renderItem('apiToken', 'API Token', apiToken, true)}
      <Box marginTop={1} />

      <Box>
        <Text color={selectedItem === 'submit' ? 'green' : undefined} bold={selectedItem === 'submit'}>
          {selectedItem === 'submit' ? '> ' : '  '}
          {canSubmit ? '[Save Configuration]' : '[Fill all fields first]'}
        </Text>
      </Box>

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">Validating credentials...</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens</Text>
      </Box>
    </Box>
  );
}
