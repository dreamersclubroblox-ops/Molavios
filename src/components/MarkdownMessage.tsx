import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-2 overflow-hidden rounded-xl ring-1 ring-border">
      <div className="flex items-center justify-between bg-muted px-3 py-1 text-[11px] font-mono text-muted-foreground">
        <span>{language || "text"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background"
        >
          {copied ? <><Check className="h-3 w-3" /> Gekopieerd</> : <><Copy className="h-3 w-3" /> Kopieer</>}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, padding: "0.75rem 1rem", fontSize: "0.8rem", background: "#0f172a" }}
        wrapLongLines
      >
        {value.replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}

interface Props { content: string; className?: string }

export function MarkdownMessage({ content, className }: Props) {
  return (
    <div className={cn(
      "prose prose-sm max-w-none",
      "prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-display",
      "prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-0",
      "prose-code:before:content-none prose-code:after:content-none",
      "prose-a:text-primary prose-a:underline-offset-2 hover:prose-a:underline",
      "prose-strong:text-foreground prose-li:my-0.5",
      "dark:prose-invert",
      className,
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || "");
            const value = String(children ?? "").replace(/\n$/, "");
            if (!inline && match) {
              return <CodeBlock language={match[1]} value={value} />;
            }
            // Multi-line code without language => still a code block
            if (!inline && value.includes("\n")) {
              return <CodeBlock language="text" value={value} />;
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },
          a({ children, href }) {
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          },
          table({ children }) {
            return <div className="my-3 overflow-x-auto rounded-lg ring-1 ring-border"><table className="m-0">{children}</table></div>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
