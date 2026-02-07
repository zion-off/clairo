import { Box, Text } from 'ink';
import Link from 'ink-link';
import { marked, Token, Tokens } from 'marked';
import Table from 'cli-table3';

type Props = {
  children: string;
};

export default function Markdown({ children }: Props) {
  const tokens = marked.lexer(children);
  return (
    <Box flexDirection="column">
      {tokens.map((token, idx) => (
        <TokenRenderer key={idx} token={token} />
      ))}
    </Box>
  );
}

function TokenRenderer({ token }: { token: Token }) {
  switch (token.type) {
    case 'heading':
      return (
        <Box marginTop={token.depth === 1 ? 0 : 1}>
          <Text bold underline={token.depth === 1}>
            {renderInline(token.tokens)}
          </Text>
        </Box>
      );

    case 'paragraph': {
      const hasLinks = token.tokens?.some((t: Token) => t.type === 'link' || (t.type === 'strong' && 'tokens' in t && t.tokens?.some((st: Token) => st.type === 'link')));
      if (hasLinks) {
        // Use Box for paragraphs with links to prevent layout issues
        return (
          <Box flexDirection="row" flexWrap="wrap">
            {renderInline(token.tokens)}
          </Box>
        );
      }
      return <Text>{renderInline(token.tokens)}</Text>;
    }

    case 'code':
      return (
        <Box marginY={1} paddingX={1} borderStyle="single" borderColor="gray">
          <Text dimColor>{token.text}</Text>
        </Box>
      );

    case 'blockquote':
      return (
        <Box marginLeft={2}>
          <Text color="gray">│ </Text>
          <Box flexDirection="column">
            {token.tokens?.map((t: Token, idx: number) => (
              <TokenRenderer key={idx} token={t} />
            ))}
          </Box>
        </Box>
      );

    case 'list':
      return (
        <Box flexDirection="column" marginY={1}>
          {token.items.map((item: Tokens.ListItem, idx: number) => (
            <Box key={idx}>
              <Text>{token.ordered ? `${idx + 1}. ` : '• '}</Text>
              <Box flexDirection="column">
                {item.tokens.map((t: Token, i: number) => (
                  <TokenRenderer key={i} token={t} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      );

    case 'table':
      return <TableRenderer token={token as Tokens.Table} />;

    case 'hr':
      return <Text dimColor>{'─'.repeat(40)}</Text>;

    case 'space':
      return null;

    default:
      // Fallback for unhandled token types
      if ('text' in token && typeof token.text === 'string') {
        return <Text>{token.text}</Text>;
      }
      return null;
  }
}

function TableRenderer({ token }: { token: Tokens.Table }) {
  const table = new Table({
    head: token.header.map((cell) => renderInlineToString(cell.tokens)),
    style: { head: ['cyan'], border: ['gray'] },
  });

  for (const row of token.rows) {
    table.push(row.map((cell) => renderInlineToString(cell.tokens)));
  }

  return <Text>{table.toString()}</Text>;
}

// Render inline tokens to React elements
function renderInline(tokens: Token[] | undefined): React.ReactNode {
  if (!tokens) return null;

  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'text':
        return <Text key={idx}>{token.text}</Text>;

      case 'strong':
        return (
          <Text key={idx} bold>
            {renderInline(token.tokens)}
          </Text>
        );

      case 'em':
        return (
          <Text key={idx} italic>
            {renderInline(token.tokens)}
          </Text>
        );

      case 'codespan':
        return (
          <Text key={idx} color="yellow">
            `{token.text}`
          </Text>
        );

      case 'link':
        return (
          <Link key={idx} url={token.href}>
            <Text color="blue">{renderInlineToString(token.tokens)}</Text>
          </Link>
        );

      case 'image':
        return (
          <Text key={idx} color="blue">
            [Image: {token.text || token.href}]
          </Text>
        );

      case 'br':
        return <Text key={idx}>{'\n'}</Text>;

      case 'del':
        return (
          <Text key={idx} strikethrough>
            {renderInline(token.tokens)}
          </Text>
        );

      default:
        if ('text' in token && typeof token.text === 'string') {
          return <Text key={idx}>{token.text}</Text>;
        }
        return null;
    }
  });
}

// Render inline tokens to plain string (for table cells)
function renderInlineToString(tokens: Token[] | undefined): string {
  if (!tokens) return '';

  return tokens
    .map((token) => {
      if ('text' in token && typeof token.text === 'string') {
        return token.text;
      }
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return renderInlineToString(token.tokens);
      }
      return '';
    })
    .join('');
}
