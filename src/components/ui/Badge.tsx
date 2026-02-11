import { Text } from 'ink';

type Props = {
  color: string;
  background: string;
  children: string;
};

export default function Badge({ color, background, children }: Props) {
  return (
    <>
      <Text color={background}>{'\uE0B6'}</Text>
      <Text color={color} backgroundColor={background} bold>
        {children}
      </Text>
      <Text color={background}>{'\uE0B4'}</Text>
    </>
  );
}
