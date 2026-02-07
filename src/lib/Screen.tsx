import { Box, useStdout } from 'ink';
import { ReactNode, useCallback, useEffect, useState } from 'react';

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  const { stdout } = useStdout();

  const getSize = useCallback(
    () => ({ height: stdout.rows, width: stdout.columns }),
    [stdout]
  );

  const [size, setSize] = useState(getSize);

  useEffect(() => {
    const onResize = () => setSize(getSize());
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout, getSize]);

  return (
    <Box height={size.height} width={size.width}>
      {children}
    </Box>
  );
}
