import { Box } from 'ink';

type Props = {
  color?: string;
};

export default function Divider({ color }: Props) {
  return (
    <Box
      flexGrow={1}
      height={0}
      borderStyle="round"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={color}
      borderDimColor={!color}
    />
  );
}
