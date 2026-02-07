import React, { ReactElement, ReactNode, useState } from 'react';
import { Box, Text, useInput } from 'ink';

type TabItemProps = {
  name: string;
  children: ReactNode;
};

export function TabItem({ children }: TabItemProps) {
  return <Box flexGrow={1}>{children}</Box>;
}

type TabsProps = {
  children: ReactElement<TabItemProps> | ReactElement<TabItemProps>[];
  defaultTab?: string;
};

export function Tabs({ children, defaultTab }: TabsProps) {
  const childArray = React.Children.toArray(children) as ReactElement<TabItemProps>[];
  const tabNames = childArray.map((child) => child.props.name);
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabNames[0]);

  useInput((_input, key) => {
    if (key.tab && activeTab) {
      const currentIndex = tabNames.indexOf(activeTab);
      const newIndex = key.shift
        ? currentIndex === 0
          ? tabNames.length - 1
          : currentIndex - 1
        : (currentIndex + 1) % tabNames.length;
      setActiveTab(tabNames[newIndex]);
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box paddingX={1} gap={1} flexShrink={0}>
        {tabNames.map((name) => (
          <Text key={name} inverse={activeTab === name} bold={activeTab === name}>
            {`${name} `}
          </Text>
        ))}
      </Box>

      <Box flexGrow={1} marginTop={1} overflow="hidden">
        {childArray.map((child) => (
          <Box key={child.props.name} display={child.props.name === activeTab ? 'flex' : 'none'} flexGrow={1}>
            {child}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
