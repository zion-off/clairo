import { useRef } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import Markdown from '../ui/Markdown.js';
import { createEmptyLog, getTodayDate, logExists, openLogInEditor } from '../../lib/logs/index.js';

type Props = {
  date: string | null;
  content: string | null;
  isFocused: boolean;
  onRefresh: () => void;
  onLogCreated: () => void;
};

export default function LogViewerBox({ date, content, isFocused, onRefresh, onLogCreated }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);

  const title = '[6] Log Content';
  const borderColor = isFocused ? 'yellow' : undefined;
  const displayTitle = date ? `${title} - ${date}.md` : title;

  useInput(
    (input, key) => {
      // Scroll navigation
      if (key.upArrow || input === 'k') {
        scrollRef.current?.scrollBy(-1);
      }
      if (key.downArrow || input === 'j') {
        scrollRef.current?.scrollBy(1);
      }

      // Edit current log
      if (input === 'e' && date) {
        openLogInEditor(date);
        onRefresh();
      }

      // Create new log for today
      if (input === 'n') {
        const today = getTodayDate();
        if (!logExists(today)) {
          createEmptyLog(today);
          onLogCreated();
        }
      }

      // Refresh
      if (input === 'r') {
        onRefresh();
      }
    },
    { isActive: isFocused }
  );

  return (
    <TitledBox borderStyle="round" titles={[displayTitle]} borderColor={borderColor} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        <ScrollView ref={scrollRef}>
          <Box flexDirection="column" paddingX={1}>
            {!date && (
              <Text dimColor>Select a log file to view</Text>
            )}
            {date && content === null && (
              <Text dimColor>Log file not found</Text>
            )}
            {date && content !== null && content.trim() === '' && (
              <Text dimColor>Empty log file</Text>
            )}
            {date && content && content.trim() !== '' && (
              <Markdown>{content}</Markdown>
            )}
          </Box>
        </ScrollView>
      </Box>
    </TitledBox>
  );
}
