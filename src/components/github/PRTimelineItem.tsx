import { Box, Text } from 'ink';
import { TimelineEvent, timeAgo } from '../../lib/github/index';
import Markdown from '../ui/Markdown';

export default function PRTimelineItem({ event }: { event: TimelineEvent }) {
  switch (event.type) {
    case 'comment':
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color="blue">
              {'\uf075'} {event.author}
            </Text>
            <Text dimColor> commented {timeAgo(event.createdAt)}</Text>
          </Box>
          {event.body && (
            <Box marginLeft={2} flexDirection="column">
              <Markdown>{event.body}</Markdown>
            </Box>
          )}
        </Box>
      );

    case 'review': {
      const color =
        event.state === 'APPROVED'
          ? 'green'
          : event.state === 'CHANGES_REQUESTED'
          ? 'red'
          : event.state === 'COMMENTED'
          ? 'blue'
          : 'yellow';
      const icon =
        event.state === 'APPROVED'
          ? '\uf00c'
          : event.state === 'CHANGES_REQUESTED'
          ? '\uf00d'
          : event.state === 'COMMENTED'
          ? '\uf075'
          : '\uf10c';
      const label =
        event.state === 'APPROVED'
          ? 'approved'
          : event.state === 'CHANGES_REQUESTED'
          ? 'requested changes'
          : event.state === 'COMMENTED'
          ? 'reviewed'
          : event.state === 'DISMISSED'
          ? 'dismissed review'
          : 'reviewed';
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color={color}>
              {icon} {event.author}
            </Text>
            <Text dimColor>
              {' '}
              {label} {timeAgo(event.createdAt)}
            </Text>
          </Box>
          {event.body && (
            <Box marginLeft={2} flexDirection="column">
              <Markdown>{event.body}</Markdown>
            </Box>
          )}
        </Box>
      );
    }

    case 'commit-group':
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color="yellow">{'\ue729'} </Text>
            <Text>
              {event.commits.length} commit{event.commits.length !== 1 ? 's' : ''} pushed
            </Text>
            <Text dimColor> {timeAgo(event.createdAt)}</Text>
          </Box>
          {event.commits.map((c) => (
            <Box key={c.oid}>
              <Text dimColor>
                {'    '}
                {c.oid.slice(0, 7)}{' '}
              </Text>
              <Text>{c.messageHeadline}</Text>
            </Box>
          ))}
        </Box>
      );
  }
}
