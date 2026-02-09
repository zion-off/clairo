import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import { useScrollToIndex } from '../../hooks/index.js';
import { LogFile } from '../../lib/logs/index.js';

type Props = {
  logFiles: LogFile[];
  selectedDate: string | null;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (date: string) => void;
  isActive: boolean;
};

export default function LogsHistoryBox({
  logFiles,
  selectedDate,
  highlightedIndex,
  onHighlight,
  onSelect,
  isActive
}: Props) {
  const scrollRef = useScrollToIndex(highlightedIndex);
  const title = '[5] Logs';
  const borderColor = isActive ? 'yellow' : undefined;

  useInput(
    (input, key) => {
      if (logFiles.length === 0) return;

      if (key.upArrow || input === 'k') {
        onHighlight(Math.max(0, highlightedIndex - 1));
      }
      if (key.downArrow || input === 'j') {
        onHighlight(Math.min(logFiles.length - 1, highlightedIndex + 1));
      }
      if (input === ' ') {
        const file = logFiles[highlightedIndex];
        if (file) {
          onSelect(file.date);
        }
      }
    },
    { isActive: isActive }
  );

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} height={5}>
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {logFiles.length === 0 && <Text dimColor>No logs yet</Text>}
        {logFiles.length > 0 && (
          <ScrollView ref={scrollRef}>
            {logFiles.map((file, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = file.date === selectedDate;
              const cursor = isHighlighted ? '>' : ' ';
              const indicator = isSelected ? ' *' : '';

              return (
                <Box key={file.date}>
                  <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                  <Text color={file.isToday ? 'green' : undefined} bold={file.isToday}>
                    {file.date}
                  </Text>
                  {file.isToday && <Text color="green"> (today)</Text>}
                  <Text dimColor>{indicator}</Text>
                </Box>
              );
            })}
          </ScrollView>
        )}
      </Box>
    </TitledBox>
  );
}
