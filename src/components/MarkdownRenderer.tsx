import { useMemo } from "react";
import { Viewer } from "@bytemd/react";
import { createMarkdownSanitizer, markdownPlugins } from "../lib/markdown";
import { cn } from "../lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const markdown = useMemo(() => content.replace(/\r\n/g, "\n"), [content]);

  return (
    <article className={cn("kuromi-markdown w-full min-w-0", className)}>
      <Viewer value={markdown} plugins={markdownPlugins} sanitize={createMarkdownSanitizer} />
    </article>
  );
}
