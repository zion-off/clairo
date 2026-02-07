import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { openInEditor } from '../../lib/editor.js';

type Props = {
  template: string | null;
  onSubmit: (title: string, body: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
};

type SelectedItem = 'title' | 'body' | 'submit';

export default function CreatePRModal({ template, onSubmit, onCancel, loading, error }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(template ?? '');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>('title');

  const items: SelectedItem[] = ['title', 'body', 'submit'];

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
        if (selectedItem === 'title') {
          const newTitle = openInEditor(title, 'PR_TITLE.txt');
          if (newTitle !== null) {
            // Take first line only for title
            setTitle(newTitle.split('\n')[0].trim());
          }
        } else if (selectedItem === 'body') {
          const newBody = openInEditor(body, 'PR_DESCRIPTION.md');
          if (newBody !== null) {
            setBody(newBody);
          }
        } else if (selectedItem === 'submit') {
          if (title.trim()) {
            onSubmit(title.trim(), body);
          }
        }
      }
    },
    { isActive: !loading }
  );

  const renderItem = (item: SelectedItem, label: string, value?: string) => {
    const isSelected = selectedItem === item;
    const prefix = isSelected ? '> ' : '  ';
    const color = isSelected ? 'yellow' : undefined;

    return (
      <Box flexDirection="column">
        <Text color={color} bold={isSelected}>
          {prefix}
          {label}
        </Text>
        {value !== undefined && (
          <Box marginLeft={4}>
            <Text dimColor>{value || '(empty - press Enter to edit)'}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const truncatedBody = body
    ? body.split('\n').slice(0, 2).join(' ').slice(0, 60) + (body.length > 60 ? '...' : '')
    : '';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        Create Pull Request
      </Text>
      <Text dimColor>Up/Down to select, Enter to edit, Esc to cancel</Text>
      <Box marginTop={1} />

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {renderItem('title', 'Title', title)}
      <Box marginTop={1} />
      {renderItem('body', 'Description', truncatedBody)}
      <Box marginTop={1} />

      <Box>
        <Text color={selectedItem === 'submit' ? 'green' : undefined} bold={selectedItem === 'submit'}>
          {selectedItem === 'submit' ? '> ' : '  '}
          {title.trim() ? '[Submit PR]' : '[Enter title first]'}
        </Text>
      </Box>

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">Creating PR...</Text>
        </Box>
      )}
    </Box>
  );
}
