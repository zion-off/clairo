import { type ReactNode } from 'react';
import { Box, Text, useStdout } from 'ink';

type Props = {
  title: string;
  borderColor?: string;
  scrollRatio?: number | null;
  fillColor?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export default function TitledBox({
  title,
  borderColor,
  scrollRatio = null,
  fillColor = '#CC6600',
  footer,
  children
}: Props) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const columnWidth = Math.floor(terminalWidth / 2);
  const titlePart = `╭ ${title} `;
  const totalDashes = Math.max(0, columnWidth - titlePart.length - 1);

  const topBorder =
    scrollRatio !== null && scrollRatio >= 0 ? (
      <Text>
        <Text color={borderColor}>{titlePart}</Text>
        <Text color={fillColor}>{'─'.repeat(Math.round(scrollRatio * totalDashes))}</Text>
        <Text color={borderColor}>{'─'.repeat(totalDashes - Math.round(scrollRatio * totalDashes))}╮</Text>
      </Text>
    ) : (
      <Text color={borderColor}>
        {titlePart}
        {'─'.repeat(totalDashes)}╮
      </Text>
    );

  return (
    <Box flexDirection="column" flexGrow={1}>
      {topBorder}
      <Box
        flexDirection="column"
        flexGrow={1}
        flexBasis={0}
        overflow="hidden"
        borderStyle="round"
        borderTop={false}
        borderColor={borderColor}
      >
        {footer ? (
          <>
            <Box flexDirection="column" flexGrow={1} flexBasis={0} overflow="hidden">
              {children}
            </Box>
            {footer}
          </>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
}
