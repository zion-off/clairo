import { Box, Text } from 'ink';

type Props = {
  ticketKey: string;
  summary: string;
  status?: string;
  isHighlighted?: boolean;
  isSelected?: boolean;
};

export default function TicketItem({ ticketKey, summary, status, isHighlighted, isSelected }: Props) {
  const prefix = isHighlighted ? '> ' : isSelected ? '● ' : '  ';
  const textColor = isSelected ? 'green' : undefined;

  return (
    <Box>
      <Text color={textColor}>
        {prefix}
        <Text bold color="blue">
          {ticketKey}
        </Text>{' '}
        {summary}
        {status && <Text dimColor> [{status}]</Text>}
      </Text>
    </Box>
  );
}
