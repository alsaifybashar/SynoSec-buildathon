import type { Components } from "react-markdown";

export const MARKDOWN_COMPONENTS_COMPACT: Components = {
  h1: ({ children }) => <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-2 text-sm leading-6 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground/90 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground/90 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.8em] text-foreground">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] leading-5 text-foreground">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="text-primary underline-offset-2 hover:underline">{children}</a>,
  hr: () => <hr className="my-4 border-border" />
};
