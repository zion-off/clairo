import { Box, Text } from 'ink';

export type Keybinding = {
  key: string;
  label: string;
  color?: string;
};

type DuckProps = {
  visible: boolean;
  message: string;
};

type Props = {
  contextBindings?: Keybinding[];
  modalOpen?: boolean;
  duck?: DuckProps;
};

const globalBindings: Keybinding[] = [
  { key: '1-4', label: 'Focus' },
  { key: 'j/k', label: 'Navigate' },
  { key: 'Ctrl+C', label: 'Quit' }
];

const modalBindings: Keybinding[] = [{ key: 'Esc', label: 'Cancel' }];

const DUCK_ASCII = "<(')___";

export default function KeybindingsBar({ contextBindings = [], modalOpen = false, duck }: Props) {
  const allBindings = modalOpen ? [...contextBindings, ...modalBindings] : [...contextBindings, ...globalBindings];

  return (
    <Box flexShrink={0} paddingX={1} gap={2}>
      {allBindings.map((binding) => (
        <Box key={binding.key} gap={1}>
          <Text bold color={binding.color ?? 'yellow'}>
            {binding.key}
          </Text>
          <Text dimColor>{binding.label}</Text>
        </Box>
      ))}
      {duck?.visible && (
        <Box flexGrow={1} justifyContent="flex-end" gap={1}>
          <Text>{DUCK_ASCII}</Text>
          <Text dimColor>{duck.message}</Text>
        </Box>
      )}
    </Box>
  );
}
