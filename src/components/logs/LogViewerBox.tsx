import { useRef, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import TextInput from 'ink-text-input';
import Markdown from '../ui/Markdown.js';
import {
  appendToLog,
  createEmptyLog,
  formatTimestamp,
  getTodayDate,
  logExists,
  openLogInEditor,
} from '../../lib/logs/index.js';

type Props = {
  date: string | null;
  content: string | null;
  isFocused: boolean;
  onRefresh: () => void;
  onLogCreated: () => void;
};

export default function LogViewerBox({ date, content, isFocused, onRefresh, onLogCreated }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const title = '[6] Log Content';
  const borderColor = isFocused ? 'yellow' : undefined;
  const displayTitle = date ? `${title} - ${date}.md` : title;

  useInput(
    (input, key) => {
      // Exit input mode on Escape
      if (key.escape && isInputMode) {
        setIsInputMode(false);
        setInputValue('');
        return;
      }

      // Don't process other keys while in input mode
      if (isInputMode) {
        return;
      }

      // Scroll navigation
      if (key.upArrow || input === 'k') {
        scrollRef.current?.scrollBy(-1);
      }
      if (key.downArrow || input === 'j') {
        scrollRef.current?.scrollBy(1);
      }

      // Edit current log in external editor
      if (input === 'e' && date) {
        openLogInEditor(date);
        onRefresh();
      }

      // Inline input mode
      if (input === 'i' && date) {
        setIsInputMode(true);
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

  const handleInputSubmit = (value: string) => {
    if (!date || !value.trim()) {
      setIsInputMode(false);
      setInputValue('');
      return;
    }

    const timestamp = formatTimestamp();
    const entry = `\n## ${timestamp}\n\n${value.trim()}\n`;
    appendToLog(date, entry);
    setInputValue('');
    setIsInputMode(false);
    onRefresh();
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
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
      {isInputMode && (
        <TitledBox borderStyle="round" titles={['Add Entry']} borderColor="yellow">
          <Box paddingX={1}>
            <TextInput
              value={inputValue}
              onChange={(val) => setInputValue(val.replace(/[\r\n]/g, ''))}
              onSubmit={handleInputSubmit}
            />
          </Box>
        </TitledBox>
      )}
    </Box>
  );
}
