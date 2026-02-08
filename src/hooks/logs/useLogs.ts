import { useCallback, useEffect, useRef, useState } from 'react';
import { LogFile, getTodayDate, listLogFiles, readLog } from '../../lib/logs/index.js';

export function useLogs() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Track initialization to prevent duplicate loads
  const initializedRef = useRef(false);

  // Load log content for a date - returns immediately usable value
  const loadLogContent = useCallback((date: string | null): string | null => {
    if (!date) {
      setLogContent(null);
      return null;
    }
    const content = readLog(date);
    setLogContent(content);
    return content;
  }, []);

  // Refresh log files list and optionally update content
  const refreshLogFiles = useCallback((): LogFile[] => {
    const files = listLogFiles();
    setLogFiles(files);
    return files;
  }, []);

  // Initialize: load files and auto-select today's log
  const initialize = useCallback(() => {
    const files = listLogFiles();
    setLogFiles(files);

    if (files.length === 0) return;

    const today = getTodayDate();
    const todayFile = files.find((f) => f.date === today);

    if (todayFile) {
      setSelectedDate(todayFile.date);
      const idx = files.findIndex((f) => f.date === today);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      loadLogContent(todayFile.date);
    } else {
      setSelectedDate(files[0].date);
      setHighlightedIndex(0);
      loadLogContent(files[0].date);
    }
  }, [loadLogContent]);

  // One-time initialization on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initialize();
  }, [initialize]);

  // Select a log date - user action, direct fetch
  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      loadLogContent(date);
    },
    [loadLogContent]
  );

  // Refresh current view (files list + content if date is selected)
  const refresh = useCallback(() => {
    refreshLogFiles();
    if (selectedDate) {
      loadLogContent(selectedDate);
    }
  }, [refreshLogFiles, selectedDate, loadLogContent]);

  // Handle external log creation (e.g., from other views)
  // Called when refreshKey changes in parent
  const handleExternalLogUpdate = useCallback(() => {
    const files = listLogFiles();
    setLogFiles(files);

    const today = getTodayDate();
    if (selectedDate === today) {
      // Refresh content if viewing today's log
      loadLogContent(today);
    } else if (!selectedDate && files.length > 0) {
      // Auto-select today if no date selected
      const todayFile = files.find((f) => f.date === today);
      if (todayFile) {
        setSelectedDate(today);
        const idx = files.findIndex((f) => f.date === today);
        setHighlightedIndex(idx >= 0 ? idx : 0);
        loadLogContent(today);
      }
    }
  }, [selectedDate, loadLogContent]);

  // Handle log creation (from viewer)
  const handleLogCreated = useCallback(() => {
    const files = listLogFiles();
    setLogFiles(files);

    const today = getTodayDate();
    setSelectedDate(today);

    const idx = files.findIndex((f) => f.date === today);
    setHighlightedIndex(idx >= 0 ? idx : 0);

    loadLogContent(today);
  }, [loadLogContent]);

  return {
    logFiles,
    selectedDate,
    logContent,
    highlightedIndex,
    setHighlightedIndex,
    selectDate,
    refresh,
    handleExternalLogUpdate,
    handleLogCreated
  };
}
