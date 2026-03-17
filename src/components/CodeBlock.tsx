import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  text: string;
  [key: string]: any;
}

export default function CodeBlock({ language, text, ...props }: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      {...props}
      style={vscDarkPlus}
      language={language}
      PreTag="div"
      customStyle={{
        margin: 0,
        padding: '1rem',
        backgroundColor: 'transparent',
        overflowX: 'hidden', // Prevent horizontal scrolling entirely
        maxWidth: '100%',
        minWidth: 0,
        display: 'block',
        width: '100%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere'
      }}
      wrapLines={true}
      wrapLongLines={true}
      lineProps={{ style: { display: 'block', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' } }}
    >
      {text}
    </SyntaxHighlighter>
  );
}
