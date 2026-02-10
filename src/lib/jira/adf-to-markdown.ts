type AdfNode = {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

/**
 * Convert an Atlassian Document Format (ADF) node to markdown text.
 * Accepts `unknown` to handle the loosely typed Jira API response.
 */
export function adfToMarkdown(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  return processNode(node as AdfNode).trimEnd();
}

function processNode(node: AdfNode, indent = ''): string {
  switch (node.type) {
    case 'doc':
      return processChildren(node, indent);

    case 'paragraph':
      return processChildren(node, indent) + '\n\n';

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = '#'.repeat(level);
      return `${prefix} ${processChildren(node, indent)}\n\n`;
    }

    case 'text':
      return applyMarks(node.text ?? '', node.marks);

    case 'hardBreak':
      return '\n';

    case 'bulletList':
      return processList(node, indent, 'bullet') + '\n';

    case 'orderedList':
      return processList(node, indent, 'ordered') + '\n';

    case 'listItem':
      return processChildren(node, indent);

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = processChildren(node, indent);
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const content = processChildren(node, indent);
      return (
        content
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n'
      );
    }

    case 'rule':
      return '---\n\n';

    case 'mention':
      return `@${(node.attrs?.text as string) ?? 'unknown'}`;

    case 'emoji':
      return (node.attrs?.shortName as string) ?? (node.attrs?.text as string) ?? '';

    case 'inlineCard': {
      const url = node.attrs?.url as string;
      return url ? `[${url}](${url})` : '';
    }

    case 'mediaSingle':
    case 'mediaGroup':
      return processChildren(node, indent);

    case 'media':
      return '[Attachment]\n\n';

    case 'table':
      return processTable(node) + '\n';

    case 'panel': {
      const panelType = (node.attrs?.panelType as string) ?? 'info';
      const label = panelType.charAt(0).toUpperCase() + panelType.slice(1);
      return `[${label}] ${processChildren(node, indent)}\n`;
    }

    default:
      // Graceful fallback: recurse into content if present
      if (node.content) {
        return processChildren(node, indent);
      }
      return node.text ?? '';
  }
}

function processChildren(node: AdfNode, indent = ''): string {
  if (!node.content) return '';
  return node.content.map((child) => processNode(child, indent)).join('');
}

function processList(node: AdfNode, indent: string, style: 'bullet' | 'ordered'): string {
  if (!node.content) return '';

  return node.content
    .map((item, idx) => {
      const prefix = style === 'bullet' ? '- ' : `${idx + 1}. `;
      const childContent = (item.content ?? [])
        .map((child) => {
          if (child.type === 'bulletList' || child.type === 'orderedList') {
            return processList(child, indent + '  ', child.type === 'bulletList' ? 'bullet' : 'ordered');
          }
          // For paragraph content inside list items, don't add trailing newlines
          if (child.type === 'paragraph') {
            return processChildren(child, indent);
          }
          return processNode(child, indent + '  ');
        })
        .join('');

      return `${indent}${prefix}${childContent}`;
    })
    .join('\n');
}

function processTable(node: AdfNode): string {
  if (!node.content) return '';

  const rows: string[][] = [];
  let hasHeader = false;

  for (const row of node.content) {
    if (row.type !== 'tableRow') continue;
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      if (cell.type === 'tableHeader') hasHeader = true;
      const text = processChildren(cell).replace(/\n/g, ' ').trim();
      cells.push(text);
    }
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map((r) => r.length));
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    while (row.length < colCount) row.push('');
    lines.push(`| ${row.join(' | ')} |`);

    if (i === 0 && hasHeader) {
      lines.push(`| ${Array(colCount).fill('---').join(' | ')} |`);
    }
  }

  return lines.join('\n') + '\n';
}

function applyMarks(text: string, marks?: AdfNode['marks']): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `**${result}**`;
        break;
      case 'em':
        result = `*${result}*`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'link': {
        const href = mark.attrs?.href as string;
        if (href) {
          result = `[${result}](${href})`;
        }
        break;
      }
      case 'underline':
        // Markdown doesn't have underline; leave as-is
        break;
    }
  }
  return result;
}
