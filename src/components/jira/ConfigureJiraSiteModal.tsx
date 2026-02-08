import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import { useScrollToIndex } from '../../hooks/index.js';
import { openInEditor } from '../../lib/editor.js';
import { ExistingJiraConfig } from '../../lib/jira/config.js';

const MAX_VISIBLE_ITEMS = 4;

type Props = {
  initialSiteUrl?: string;
  initialEmail?: string;
  existingConfigs?: ExistingJiraConfig[];
  onSubmit: (siteUrl: string, email: string, apiToken: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
};

type SelectedItem = 'siteUrl' | 'email' | 'apiToken' | 'submit';
type Mode = 'choose' | 'manual';

export default function ConfigureJiraSiteModal({
  initialSiteUrl,
  initialEmail,
  existingConfigs = [],
  onSubmit,
  onCancel,
  loading,
  error
}: Props) {
  const hasExisting = existingConfigs.length > 0;
  const [mode, setMode] = useState<Mode>(hasExisting ? 'choose' : 'manual');
  const [selectedExisting, setSelectedExisting] = useState(0);
  const scrollRef = useScrollToIndex(selectedExisting);
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [apiToken, setApiToken] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>('siteUrl');

  const items: SelectedItem[] = ['siteUrl', 'email', 'apiToken', 'submit'];

  const canSubmit = siteUrl.trim() && email.trim() && apiToken.trim();

  // Total items in choose mode: existing configs + "Enter manually" option
  const chooseItems = existingConfigs.length + 1;

  useInput(
    (input, key) => {
      if (loading) return;

      if (key.escape) {
        if (mode === 'manual' && hasExisting) {
          setMode('choose');
          return;
        }
        onCancel();
        return;
      }

      if (mode === 'choose') {
        if (key.upArrow || input === 'k') {
          setSelectedExisting((prev) => Math.max(0, prev - 1));
          return;
        }
        if (key.downArrow || input === 'j') {
          setSelectedExisting((prev) => Math.min(chooseItems - 1, prev + 1));
          return;
        }
        if (key.return) {
          if (selectedExisting < existingConfigs.length) {
            const config = existingConfigs[selectedExisting];
            onSubmit(config.siteUrl, config.email, config.apiToken);
          } else {
            setMode('manual');
          }
        }
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

  if (mode === 'choose') {
    // Each config takes 2 lines (url + email), plus 1 for "Enter new credentials"
    const totalItems = existingConfigs.length + 1;
    const listHeight = Math.min(totalItems * 2, MAX_VISIBLE_ITEMS * 2);

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Text bold color="cyan">
          Configure Jira Site
        </Text>
        <Text dimColor>Select an existing configuration or enter new credentials</Text>
        <Box marginTop={1} />

        {error && (
          <Box marginBottom={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}

        <Box height={listHeight} overflow="hidden">
          <ScrollView ref={scrollRef}>
            {existingConfigs.map((config, idx) => {
              const isSelected = selectedExisting === idx;
              return (
                <Box key={config.siteUrl + config.email} flexDirection="column">
                  <Text color={isSelected ? 'yellow' : undefined} bold={isSelected}>
                    {isSelected ? '> ' : '  '}
                    {config.siteUrl}
                  </Text>
                  <Text dimColor> {config.email}</Text>
                </Box>
              );
            })}

            <Box>
              <Text
                color={selectedExisting === existingConfigs.length ? 'yellow' : undefined}
                bold={selectedExisting === existingConfigs.length}
              >
                {selectedExisting === existingConfigs.length ? '> ' : '  '}
                Enter new credentials...
              </Text>
            </Box>
          </ScrollView>
        </Box>

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">Validating credentials...</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        Configure Jira Site
      </Text>
      <Text dimColor>Up/Down to select, Enter to edit, Esc to {hasExisting ? 'go back' : 'cancel'}</Text>
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
