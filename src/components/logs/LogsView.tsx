import { useCallback, useEffect, useState } from 'react';
import { Box, useInput } from 'ink';
import { Keybinding } from '../ui/KeybindingsBar.js';
import { listLogFiles, readLog, LogFile, getTodayDate } from '../../lib/logs/index.js';
import LogsHistoryBox from './LogsHistoryBox.js';
import LogViewerBox from './LogViewerBox.js';

type FocusedBox = 'history' | 'viewer';

type Props = {
  isFocused: boolean;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
  refreshKey?: number;
};

export default function LogsView({ isFocused, onKeybindingsChange, refreshKey }: Props) {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [focusedBox, setFocusedBox] = useState<FocusedBox>('history');

  // Update keybindings based on focused box
  useEffect(() => {
    if (!isFocused) {
      onKeybindingsChange?.([]);
      return;
    }

    const bindings: Keybinding[] = [];

    if (focusedBox === 'history') {
      bindings.push({ key: 'Enter', label: 'Select' });
    } else if (focusedBox === 'viewer') {
      bindings.push({ key: 'i', label: 'Add Entry' });
      bindings.push({ key: 'e', label: 'Edit' });
      bindings.push({ key: 'n', label: 'New Log', color: 'green' });
      bindings.push({ key: 'r', label: 'Refresh' });
    }

    onKeybindingsChange?.(bindings);
  }, [isFocused, focusedBox, onKeybindingsChange]);

  // Load log files on mount and when focused
  const refreshLogFiles = useCallback(() => {
    const files = listLogFiles();
    setLogFiles(files);

    // Auto-select today's log if exists, otherwise first file
    if (files.length > 0 && !selectedDate) {
      const today = getTodayDate();
      const todayFile = files.find((f) => f.date === today);
      if (todayFile) {
        setSelectedDate(todayFile.date);
        const idx = files.findIndex((f) => f.date === today);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      } else {
        setSelectedDate(files[0].date);
        setHighlightedIndex(0);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    refreshLogFiles();
  }, [refreshLogFiles]);

  // Load log content when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const content = readLog(selectedDate);
      setLogContent(content);
    } else {
      setLogContent(null);
    }
  }, [selectedDate]);

  // Refresh when refreshKey changes (triggered by other views after logging)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      const files = listLogFiles();
      setLogFiles(files);

      // Refresh content if viewing today's log
      const today = getTodayDate();
      if (selectedDate === today) {
        const content = readLog(today);
        setLogContent(content);
      } else if (!selectedDate && files.length > 0) {
        // Auto-select today if no date selected
        const todayFile = files.find((f) => f.date === today);
        if (todayFile) {
          setSelectedDate(today);
          const idx = files.findIndex((f) => f.date === today);
          setHighlightedIndex(idx >= 0 ? idx : 0);
        }
      }
    }
  }, [refreshKey, selectedDate]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshLogFiles();
    if (selectedDate) {
      const content = readLog(selectedDate);
      setLogContent(content);
    }
  }, [refreshLogFiles, selectedDate]);

  const handleLogCreated = useCallback(() => {
    const files = listLogFiles();
    setLogFiles(files);

    const today = getTodayDate();
    setSelectedDate(today);

    const idx = files.findIndex((f) => f.date === today);
    setHighlightedIndex(idx >= 0 ? idx : 0);

    const content = readLog(today);
    setLogContent(content);
  }, []);

  // Keyboard navigation for switching between boxes
  useInput(
    (input) => {
      if (input === '5') setFocusedBox('history');
      if (input === '6') setFocusedBox('viewer');
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column" flexGrow={1}>
      <LogsHistoryBox
        logFiles={logFiles}
        selectedDate={selectedDate}
        highlightedIndex={highlightedIndex}
        onHighlight={setHighlightedIndex}
        onSelect={handleSelectDate}
        isFocused={isFocused && focusedBox === 'history'}
      />
      <LogViewerBox
        date={selectedDate}
        content={logContent}
        isFocused={isFocused && focusedBox === 'viewer'}
        onRefresh={handleRefresh}
        onLogCreated={handleLogCreated}
      />
    </Box>
  );
}
