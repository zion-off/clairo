import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, useInput } from 'ink';
import { JiraBrowserFocusedBox } from '../../constants/jira-browser.js';
import { useGitRepo } from '../../hooks/github/index.js';
import { useModal } from '../../hooks/index.js';
import { SavedJiraView } from '../../lib/config/index.js';
import { JiraAuth, getCurrentUser } from '../../lib/jira/api.js';
import { getJiraCredentials, getJiraSiteUrl, isJiraConfigured } from '../../lib/jira/config.js';
import { parseJiraUrl } from '../../lib/jira/url-parser.js';
import { addSavedView, getSavedViews, removeSavedView, renameSavedView } from '../../lib/jira/views.js';
import AddViewModal from './AddViewModal.js';
import JiraSavedViewBrowserBox from './JiraSavedViewBrowserBox.js';
import JiraSavedViewsBox from './JiraSavedViewsBox.js';

type Props = {
  isActive: boolean;
  focusedBox: JiraBrowserFocusedBox;
  onFocusedBoxChange: (box: JiraBrowserFocusedBox) => void;
  onModalChange?: (isOpen: boolean) => void;
  onLogUpdated?: () => void;
};

export default function JiraBrowserView({
  isActive,
  focusedBox,
  onFocusedBoxChange,
  onModalChange,
  onLogUpdated
}: Props) {
  const repo = useGitRepo();
  const modal = useModal<'add'>();
  const [views, setViews] = useState<SavedJiraView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [addError, setAddError] = useState<string | undefined>(undefined);
  const [addLoading, setAddLoading] = useState(false);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [inputModeActive, setInputModeActive] = useState(false);
  const lastRepoRef = useRef<string | null>(null);

  // Derive auth from repo config
  const auth = useMemo((): JiraAuth | null => {
    if (!repo.repoPath || !isJiraConfigured(repo.repoPath)) return null;
    const siteUrl = getJiraSiteUrl(repo.repoPath);
    const creds = getJiraCredentials(repo.repoPath);
    if (!siteUrl || !creds.email || !creds.apiToken) return null;
    return { siteUrl, email: creds.email, apiToken: creds.apiToken };
  }, [repo.repoPath]);

  const selectedView = useMemo(() => views.find((v) => v.id === selectedViewId) ?? null, [views, selectedViewId]);

  // Load views when repo is ready
  useEffect(() => {
    if (!repo.repoPath || repo.repoPath === lastRepoRef.current) return;
    lastRepoRef.current = repo.repoPath;
    const loaded = getSavedViews(repo.repoPath);
    setViews(loaded);
    if (loaded.length > 0 && !selectedViewId) {
      setSelectedViewId(loaded[0]!.id);
    }
  }, [repo.repoPath]);

  // Fetch current user's account ID for "assigned to me" filter
  useEffect(() => {
    if (!auth) {
      setMyAccountId(null);
      return;
    }
    getCurrentUser(auth).then((result) => {
      if (result.success) {
        setMyAccountId(result.data.accountId);
        setMyDisplayName(result.data.displayName);
      }
    });
  }, [auth?.siteUrl, auth?.email]);

  // Notify parent of modal/input-mode state
  useEffect(() => {
    onModalChange?.(modal.isOpen || inputModeActive);
  }, [modal.isOpen, inputModeActive, onModalChange]);

  // Close modal when unfocused
  useEffect(() => {
    if (!isActive) modal.close();
  }, [isActive, modal.close]);

  const refreshViews = useCallback(() => {
    if (!repo.repoPath) return;
    setViews(getSavedViews(repo.repoPath));
  }, [repo.repoPath]);

  const handleSelectView = useCallback((viewId: string) => {
    setSelectedViewId(viewId);
  }, []);

  const handleAddView = useCallback(
    async (url: string, name: string) => {
      if (!repo.repoPath) return;

      const source = parseJiraUrl(url);
      if (!source) {
        setAddError('Unrecognized Jira URL format');
        return;
      }

      setAddLoading(true);
      setAddError(undefined);

      try {
        const view = addSavedView(repo.repoPath, name, url, source);
        refreshViews();
        setSelectedViewId(view.id);
        modal.close();
      } catch {
        setAddError('Failed to save view');
      } finally {
        setAddLoading(false);
      }
    },
    [repo.repoPath, refreshViews, modal.close]
  );

  const handleRenameView = useCallback(
    (viewId: string, newName: string) => {
      if (!repo.repoPath) return;
      renameSavedView(repo.repoPath, viewId, newName);
      refreshViews();
    },
    [repo.repoPath, refreshViews]
  );

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (!repo.repoPath) return;
      removeSavedView(repo.repoPath, viewId);
      refreshViews();
      if (selectedViewId === viewId) {
        const remaining = getSavedViews(repo.repoPath);
        setSelectedViewId(remaining.length > 0 ? remaining[0]!.id : null);
      }
      setHighlightedIndex((i) => Math.max(0, i - 1));
    },
    [repo.repoPath, selectedViewId, refreshViews]
  );

  // Box switching
  useInput(
    (input) => {
      if (input === '5') onFocusedBoxChange('saved-views');
      if (input === '6') onFocusedBoxChange('browser');
    },
    { isActive: isActive && !modal.isOpen }
  );

  // Modal rendering
  if (modal.type === 'add') {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <AddViewModal
          onSubmit={handleAddView}
          onCancel={() => {
            modal.close();
            setAddError(undefined);
          }}
          loading={addLoading}
          error={addError}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <JiraSavedViewsBox
        views={views}
        selectedViewId={selectedViewId}
        highlightedIndex={highlightedIndex}
        onHighlight={setHighlightedIndex}
        onSelect={handleSelectView}
        onAdd={() => modal.open('add')}
        onDelete={handleDeleteView}
        onRename={handleRenameView}
        isActive={isActive && focusedBox === 'saved-views'}
        onInputModeChange={setInputModeActive}
      />
      <JiraSavedViewBrowserBox
        view={selectedView}
        auth={auth}
        myAccountId={myAccountId}
        myDisplayName={myDisplayName}
        isActive={isActive && focusedBox === 'browser'}
        onInputModeChange={setInputModeActive}
        onLogUpdated={onLogUpdated}
      />
    </Box>
  );
}
