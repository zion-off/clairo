import { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { LogsFocusedBox } from '../../constants/logs';
import { useLogs } from '../../hooks/logs/index';
import LogViewerBox from './LogViewerBox';
import LogsHistoryBox from './LogsHistoryBox';

type Props = {
  isActive: boolean;
  refreshKey?: number;
  focusedBox: LogsFocusedBox;
  onFocusedBoxChange: (box: LogsFocusedBox) => void;
};

export default function LogsView({ isActive, refreshKey, focusedBox, onFocusedBoxChange }: Props) {
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
    { isActive: isActive }
  );

  return (
    <Box flexDirection="column" flexGrow={1}>
      <LogsHistoryBox
        logFiles={logs.logFiles}
        selectedDate={logs.selectedDate}
        highlightedIndex={logs.highlightedIndex}
        onHighlight={logs.setHighlightedIndex}
        onSelect={logs.selectDate}
        isActive={isActive && focusedBox === 'history'}
      />
      <LogViewerBox
        date={logs.selectedDate}
        content={logs.logContent}
        isActive={isActive && focusedBox === 'viewer'}
        onRefresh={logs.refresh}
        onLogCreated={logs.handleLogCreated}
      />
    </Box>
  );
}
