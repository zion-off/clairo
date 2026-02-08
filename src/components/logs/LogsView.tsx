import { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { useLogs } from '../../hooks/logs/index.js';
import { LogsFocusedBox } from '../../constants/logs.js';
import LogsHistoryBox from './LogsHistoryBox.js';
import LogViewerBox from './LogViewerBox.js';

type Props = {
  isFocused: boolean;
  refreshKey?: number;
  focusedBox: LogsFocusedBox;
  onFocusedBoxChange: (box: LogsFocusedBox) => void;
};

export default function LogsView({ isFocused, refreshKey, focusedBox, onFocusedBoxChange }: Props) {
  const logs = useLogs();

  // React to external log updates (from other views logging actions)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      logs.handleExternalLogUpdate();
    }
  }, [refreshKey, logs.handleExternalLogUpdate]);

  // Keyboard navigation for switching between boxes
  useInput(
    (input) => {
      if (input === '5') onFocusedBoxChange('history');
      if (input === '6') onFocusedBoxChange('viewer');
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column" flexGrow={1}>
      <LogsHistoryBox
        logFiles={logs.logFiles}
        selectedDate={logs.selectedDate}
        highlightedIndex={logs.highlightedIndex}
        onHighlight={logs.setHighlightedIndex}
        onSelect={logs.selectDate}
        isFocused={isFocused && focusedBox === 'history'}
      />
      <LogViewerBox
        date={logs.selectedDate}
        content={logs.logContent}
        isFocused={isFocused && focusedBox === 'viewer'}
        onRefresh={logs.refresh}
        onLogCreated={logs.handleLogCreated}
      />
    </Box>
  );
}
