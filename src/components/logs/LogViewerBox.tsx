import { useRef, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import TextInput from 'ink-text-input';
import { ClaudeProcess, generateStandupNotes } from '../../lib/claude/index.js';
import {
  appendToLog,
  createEmptyLog,
  formatTimestamp,
  getTodayDate,
  logExists,
  openLogInEditor
} from '../../lib/logs/index.js';
import Markdown from '../ui/Markdown.js';

type Props = {
  date: string | null;
  content: string | null;
  isActive: boolean;
  onRefresh: () => void;
  onLogCreated: () => void;
};

export default function LogViewerBox({ date, content, isActive, onRefresh, onLogCreated }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingStandup, setIsGeneratingStandup] = useState(false);
  const [standupResult, setStandupResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const claudeProcessRef = useRef<ClaudeProcess | null>(null);

  const title = '[6] Log Content';
  const borderColor = isActive ? 'yellow' : undefined;
  const displayTitle = date ? `${title} - ${date}.md` : title;

  useInput(
    (input, key) => {
      // Exit input mode on Escape
      if (key.escape && isInputMode) {
        setIsInputMode(false);
        setInputValue('');
        return;
      }

      // Cancel standup generation on Escape
      if (key.escape && isGeneratingStandup) {
        claudeProcessRef.current?.cancel();
        claudeProcessRef.current = null;
        setIsGeneratingStandup(false);
        return;
      }

      // Dismiss standup result on Escape
      if (key.escape && standupResult) {
        setStandupResult(null);
        return;
      }

      // Don't process other keys while in input mode or showing standup result
      if (isInputMode || standupResult) {
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

      // Generate standup notes with Claude
      if (input === 'c' && date && content && !isGeneratingStandup) {
        setIsGeneratingStandup(true);
        setStandupResult(null);

        const process = generateStandupNotes(content);
        claudeProcessRef.current = process;

        process.promise.then((result) => {
          claudeProcessRef.current = null;
          setIsGeneratingStandup(false);
          if (result.success) {
            setStandupResult({ type: 'success', message: result.data });
          } else if (result.error !== 'Cancelled') {
            setStandupResult({ type: 'error', message: result.error });
          }
        });
      }
    },
    { isActive: isActive }
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
              {!date && <Text dimColor>Select a log file to view</Text>}
              {date && content === null && <Text dimColor>Log file not found</Text>}
              {date && content !== null && content.trim() === '' && <Text dimColor>Empty log file</Text>}
              {date && content && content.trim() !== '' && <Markdown>{content}</Markdown>}
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
      {isGeneratingStandup && (
        <TitledBox borderStyle="round" titles={['Standup Notes']} borderColor="yellow">
          <Box paddingX={1} flexDirection="column">
            <Text color="yellow">Generating standup notes...</Text>
            <Text dimColor>Press Esc to cancel</Text>
          </Box>
        </TitledBox>
      )}
      {standupResult && (
        <TitledBox
          borderStyle="round"
          titles={['Standup Notes']}
          borderColor={standupResult.type === 'error' ? 'red' : 'green'}
        >
          <Box paddingX={1} flexDirection="column">
            {standupResult.type === 'error' ? (
              <Text color="red">{standupResult.message}</Text>
            ) : (
              <Markdown>{standupResult.message}</Markdown>
            )}
            <Text dimColor>Press Esc to dismiss</Text>
          </Box>
        </TitledBox>
      )}
    </Box>
  );
}
