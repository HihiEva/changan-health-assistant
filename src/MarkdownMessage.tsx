import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function displayMarkdown(text: string) {
  const fenced = text.trim().match(/^```(?:markdown|md)\s*\n([\s\S]*?)\n```$/i);
  return fenced ? fenced[1] : text;
}
export default function MarkdownMessage({ text }: { text: string }) {
  return <div className="markdown-message"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    img: () => <span>［外部图片未加载］</span>,
    a: ({ children, href }) => <a href={href?.match(/^https?:\/\//) ? href : undefined} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
  }}>{displayMarkdown(text)}</Markdown></div>;
}
