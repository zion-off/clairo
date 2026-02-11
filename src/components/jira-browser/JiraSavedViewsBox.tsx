import { useEffect, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import { useScrollToIndex } from '../../hooks/index';
import { SavedJiraView } from '../../lib/config/index';
import TextInput from '../ui/TextInput';

type Props = {
  views: SavedJiraView[];
  selectedViewId: string | null;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (viewId: string) => void;
  onAdd: () => void;
  onDelete: (viewId: string) => void;
  onRename: (viewId: string, newName: string) => void;
  isActive: boolean;
  onInputModeChange?: (active: boolean) => void;
};

export default function JiraSavedViewsBox({
  views,
  selectedViewId,
  highlightedIndex,
  onHighlight,
  onSelect,
  onAdd,
  onDelete,
  onRename,
  isActive,
  onInputModeChange
}: Props) {
  const scrollRef = useScrollToIndex(highlightedIndex);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    onInputModeChange?.(renaming !== null);
  }, [renaming, onInputModeChange]);

  const title = '[5] Views';
  const borderColor = isActive ? 'yellow' : undefined;

  useInput(
    (input, key) => {
      // Rename mode
      if (renaming) {
        if (key.escape) {
          setRenaming(null);
          setRenameValue('');
          return;
        }
        if (key.return) {
          const trimmed = renameValue.trim();
          if (trimmed.length > 0) {
            onRename(renaming, trimmed);
          }
          setRenaming(null);
          setRenameValue('');
          return;
        }
        return;
      }

      // Normal mode
      if (views.length === 0) {
        if (input === 'a') onAdd();
        return;
      }

      if (key.upArrow || input === 'k') {
        onHighlight(Math.max(0, highlightedIndex - 1));
      }
      if (key.downArrow || input === 'j') {
        onHighlight(Math.min(views.length - 1, highlightedIndex + 1));
      }
      if (input === ' ') {
        const view = views[highlightedIndex];
        if (view) onSelect(view.id);
      }
      if (input === 'a') onAdd();
      if (input === 'e') {
        const view = views[highlightedIndex];
        if (view) {
          setRenaming(view.id);
          setRenameValue(view.name);
        }
      }
      if (input === 'd') {
        const view = views[highlightedIndex];
        if (view) onDelete(view.id);
      }
    },
    { isActive }
  );

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} height={5}>
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {views.length === 0 && <Text dimColor>No saved views</Text>}
        {views.length > 0 && (
          <ScrollView ref={scrollRef}>
            {views.map((view, idx) => {
              const isHighlighted = isActive && idx === highlightedIndex;
              const isSelected = view.id === selectedViewId;
              const isRenaming = view.id === renaming;
              const cursor = isHighlighted ? '>' : ' ';
              const nameColor = isSelected ? 'green' : undefined;
              const indicator = isSelected ? ' *' : '';

              return (
                <Box key={view.id}>
                  <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                  {isRenaming ? (
                    <TextInput value={renameValue} onChange={setRenameValue} isActive={true} />
                  ) : (
                    <>
                      <Text color={nameColor}>{view.name}</Text>
                      <Text dimColor>{indicator}</Text>
                    </>
                  )}
                </Box>
              );
            })}
          </ScrollView>
        )}
      </Box>
    </TitledBox>
  );
}
