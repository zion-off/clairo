import { Box, Text, useInput } from 'ink';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isActive: boolean;
  mask?: boolean;
};

export default function TextInput({ value, onChange, placeholder, isActive, mask }: Props) {
  useInput(
    (input, key) => {
      if (key.backspace || key.delete) {
        if (value.length > 0) {
          onChange(value.slice(0, -1));
        }
        return;
      }

      if (key.return || key.escape || key.upArrow || key.downArrow || key.tab) {
        return;
      }

      // Accept printable characters (single keypress or pasted text)
      if (input && input.length > 0) {
        const printable = input.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
        if (printable.length > 0) {
          onChange(value + printable);
        }
      }
    },
    { isActive }
  );

  const displayValue = mask ? '*'.repeat(value.length) : value;
  const showPlaceholder = value.length === 0 && placeholder;

  return (
    <Box>
      <Text>
        {showPlaceholder ? <Text dimColor>{placeholder}</Text> : <Text>{displayValue}</Text>}
        {isActive && <Text backgroundColor="yellow"> </Text>}
      </Text>
    </Box>
  );
}
