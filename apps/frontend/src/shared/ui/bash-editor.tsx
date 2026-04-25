import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, FileUp, Scissors, Terminal } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type BashEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  filename?: string;
  allowImport?: boolean;
  minHeight?: number;
  "aria-label"?: string;
};

type TokenType =
  | "plain"
  | "ws"
  | "shebang"
  | "comment"
  | "string"
  | "variable"
  | "keyword"
  | "builtin"
  | "operator"
  | "number"
  | "flag";

type Token = { type: TokenType; text: string };

const BASH_KEYWORDS = new Set([
  "if", "then", "fi", "else", "elif", "while", "do", "done", "for", "in",
  "case", "esac", "function", "return", "break", "continue", "local",
  "readonly", "export", "declare", "set", "unset", "shift", "trap", "exec",
  "source", "eval", "let", "time", "until", "select"
]);

const BASH_BUILTINS = new Set([
  "echo", "printf", "read", "test", "true", "false", "exit", "cd", "pwd",
  "pushd", "popd", "dirs", "alias", "unalias", "type", "which", "command",
  "builtin", "enable", "kill", "jobs", "bg", "fg", "wait", "sleep", "env",
  "getopts", "mapfile", "readarray",
  "curl", "wget", "grep", "egrep", "fgrep", "sed", "awk", "cat", "tac",
  "head", "tail", "sort", "uniq", "wc", "cut", "tr", "tee", "xargs",
  "find", "ls", "mkdir", "rmdir", "rm", "mv", "cp", "ln", "chmod", "chown",
  "tar", "gzip", "gunzip", "zip", "unzip", "jq", "yq", "python", "python3",
  "node", "ruby", "perl", "bash", "sh", "docker", "kubectl", "nmap", "dig",
  "nslookup", "host", "openssl", "ssh", "scp", "rsync", "git", "make", "systemctl"
]);

const tokenColors: Record<TokenType, string> = {
  plain: "text-slate-200",
  ws: "",
  shebang: "text-violet-300 italic",
  comment: "text-slate-500 italic",
  string: "text-amber-300",
  variable: "text-pink-300",
  keyword: "text-sky-300",
  builtin: "text-lime-300",
  operator: "text-rose-300",
  number: "text-amber-200",
  flag: "text-violet-200"
};

function tokenizeLine(line: string): Token[] {
  if (/^\s*#!/.test(line)) {
    return [{ type: "shebang", text: line }];
  }

  const tokens: Token[] = [];
  const len = line.length;
  const at = (idx: number): string => (idx >= 0 && idx < len ? line.charAt(idx) : "");
  let i = 0;

  while (i < len) {
    const ch = at(i);

    if (ch === " " || ch === "\t") {
      let j = i;
      while (j < len) {
        const c = at(j);
        if (c !== " " && c !== "\t") break;
        j++;
      }
      tokens.push({ type: "ws", text: line.substring(i, j) });
      i = j;
      continue;
    }

    if (ch === "#" && (i === 0 || /\s/.test(at(i - 1)))) {
      tokens.push({ type: "comment", text: line.substring(i) });
      i = len;
      break;
    }

    if (ch === "'") {
      const end = line.indexOf("'", i + 1);
      const stop = end >= 0 ? end + 1 : len;
      tokens.push({ type: "string", text: line.substring(i, stop) });
      i = stop;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < len) {
        const c = at(j);
        if (c === "\\" && j + 1 < len) { j += 2; continue; }
        if (c === '"') { j++; break; }
        j++;
      }
      tokens.push({ type: "string", text: line.substring(i, j) });
      i = j;
      continue;
    }

    if (ch === "`") {
      const end = line.indexOf("`", i + 1);
      const stop = end >= 0 ? end + 1 : len;
      tokens.push({ type: "string", text: line.substring(i, stop) });
      i = stop;
      continue;
    }

    if (ch === "$") {
      let j = i + 1;
      const next = at(j);
      if (next === "{") {
        const end = line.indexOf("}", j);
        j = end >= 0 ? end + 1 : len;
      } else if (next === "(") {
        j++;
      } else if (/[a-zA-Z_]/.test(next)) {
        while (j < len && /\w/.test(at(j))) j++;
      } else if (/[0-9*@#?!$]/.test(next)) {
        j++;
      }
      tokens.push({ type: "variable", text: line.substring(i, j) });
      i = j;
      continue;
    }

    if (/[|&;<>()]/.test(ch)) {
      let j = i + 1;
      const next = at(j);
      if ((ch === "|" || ch === "&") && next === ch) j++;
      else if (ch === ">" && next === ">") j++;
      else if (ch === "<" && next === "<") j++;
      tokens.push({ type: "operator", text: line.substring(i, j) });
      i = j;
      continue;
    }

    let j = i;
    while (j < len) {
      const c = at(j);
      if (/[\s|&;<>()"'`$#]/.test(c)) break;
      j++;
    }
    const word = line.substring(i, j);
    let type: TokenType = "plain";
    if (BASH_KEYWORDS.has(word)) type = "keyword";
    else if (BASH_BUILTINS.has(word)) type = "builtin";
    else if (/^-{1,2}[A-Za-z][\w-]*$/.test(word)) type = "flag";
    else if (/^-?\d+(?:\.\d+)?$/.test(word)) type = "number";
    tokens.push({ type, text: word });
    i = j === i ? i + 1 : j;
  }

  return tokens;
}

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_IMPORT_BYTES = 256 * 1024;

export function BashEditor({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  filename = "tool.sh",
  allowImport = true,
  minHeight = 220,
  "aria-label": ariaLabel = "Bash source"
}: BashEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  const [cursor, setCursor] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [focused, setFocused] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [displayName, setDisplayName] = useState<string>(filename);

  const effectiveReadOnly = disabled || readOnly;

  const lines = useMemo(() => value.split("\n"), [value]);

  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const upToCursor = ta.value.substring(0, pos);
    const newlineCount = (upToCursor.match(/\n/g) ?? []).length;
    const lastNewline = upToCursor.lastIndexOf("\n");
    setCursor({
      line: newlineCount + 1,
      column: pos - (lastNewline + 1) + 1
    });
  }, []);

  useEffect(() => {
    updateCursor();
  }, [value, updateCursor]);

  useEffect(() => {
    setDisplayName(filename);
  }, [filename]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (effectiveReadOnly) return;
      if (event.key === "Tab") {
        event.preventDefault();
        const ta = event.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = `${ta.value.substring(0, start)}  ${ta.value.substring(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2;
            textareaRef.current.selectionEnd = start + 2;
          }
        });
      }
    },
    [effectiveReadOnly, onChange]
  );

  const openFileDialog = useCallback(() => {
    if (effectiveReadOnly || !allowImport) return;
    fileInputRef.current?.click();
  }, [allowImport, effectiveReadOnly]);

  const importFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMPORT_BYTES) {
        toast.error(`${file.name} is too large (${bytes(file.size)} · limit ${bytes(MAX_IMPORT_BYTES)})`);
        return;
      }
      try {
        const text = await file.text();
        onChange(text);
        setDisplayName(file.name);
        toast.success(`Imported ${file.name}`, { description: `${bytes(file.size)} · ${text.split("\n").length} lines` });
      } catch (error) {
        toast.error(`Could not read ${file.name}`, {
          description: error instanceof Error ? error.message : undefined
        });
      }
    },
    [onChange]
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void importFile(file);
      event.target.value = "";
    },
    [importFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      if (effectiveReadOnly || !allowImport) return;
      const file = event.dataTransfer.files?.[0];
      if (file) void importFile(file);
    },
    [allowImport, effectiveReadOnly, importFile]
  );

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1400);
    } catch {
      toast.error("Clipboard unavailable");
    }
  }, [value]);

  const stripTrailing = useCallback(() => {
    if (effectiveReadOnly) return;
    const cleaned = value
      .split("\n")
      .map((ln) => ln.replace(/[ \t]+$/, ""))
      .join("\n");
    if (cleaned !== value) {
      onChange(cleaned);
      toast.success("Trimmed trailing whitespace");
    }
  }, [effectiveReadOnly, onChange, value]);

  const renderedLines = useMemo(() => {
    return lines.map((line, lineIdx) => {
      const tokens = tokenizeLine(line);
      const isActive = lineIdx + 1 === cursor.line && focused;
      return (
        <span key={lineIdx} className="relative block">
          <span
            aria-hidden
            className={cn(
              "absolute top-0 w-[32px] select-none text-right tabular-nums",
              isActive ? "text-lime-300" : "text-slate-600"
            )}
            style={{ left: -44 }}
          >
            {lineIdx + 1}
          </span>
          {tokens.length === 0
            ? "​"
            : tokens.map((token, tokenIdx) => {
                const cls = tokenColors[token.type];
                return cls ? (
                  <span key={tokenIdx} className={cls}>
                    {token.text}
                  </span>
                ) : (
                  <span key={tokenIdx}>{token.text}</span>
                );
              })}
        </span>
      );
    });
  }, [lines, cursor.line, focused]);

  return (
    <div
      className={cn(
        "group/editor relative overflow-hidden rounded-md border font-mono text-[13px] shadow-[0_20px_40px_-24px_rgba(8,15,35,0.65)] transition-all",
        "border-[#1f2a44] bg-[#0b1020]",
        focused && !effectiveReadOnly && "border-lime-400/60 shadow-[0_0_0_1px_rgba(163,230,53,0.25),0_20px_50px_-24px_rgba(163,230,53,0.18)]",
        dragActive && "border-lime-400 ring-2 ring-lime-400/50",
        effectiveReadOnly && "opacity-80"
      )}
      onDragEnter={(event) => {
        if (effectiveReadOnly || !allowImport) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (effectiveReadOnly || !allowImport) return;
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 border-b border-[#1a223a] bg-[#070b18] px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-t-sm border-b-2 border-lime-400/70 bg-[#0b1020] px-2.5 py-1 text-[11px] text-slate-200">
          <Terminal className="h-3 w-3 text-lime-300" />
          <span className="tracking-wide">{displayName}</span>
          {!effectiveReadOnly ? <span className="ml-1 text-slate-500" aria-hidden>•</span> : null}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {allowImport && !effectiveReadOnly ? (
            <>
              <input
                ref={fileInputRef}
                id={inputId}
                type="file"
                accept=".sh,.bash,.zsh,text/x-shellscript,text/plain"
                className="sr-only"
                onChange={handleFileInput}
                aria-label="Import shell script"
              />
              <button
                type="button"
                onClick={openFileDialog}
                className="inline-flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-lime-400/40 hover:bg-lime-400/10 hover:text-lime-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime-400/60"
              >
                <FileUp className="h-3 w-3" />
                Import .sh
              </button>
            </>
          ) : null}
          {!effectiveReadOnly ? (
            <button
              type="button"
              onClick={stripTrailing}
              title="Strip trailing whitespace"
              className="inline-flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/60"
            >
              <Scissors className="h-3 w-3" />
              Trim
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void copyToClipboard()}
            className="inline-flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-slate-400/40 hover:bg-slate-400/10 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/60"
          >
            {justCopied ? (
              <>
                <Check className="h-3 w-3 text-lime-300" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative" style={{ minHeight }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[44px] border-r border-[#1a223a] bg-[#080d1b]"
        />

        <pre
          aria-hidden
          className="pointer-events-none relative m-0 whitespace-pre-wrap break-words py-3 pl-[56px] pr-4 text-[13px] leading-[1.6] text-slate-200"
          style={{ tabSize: 2, overflowWrap: "anywhere", minHeight }}
        >
          {renderedLines}
        </pre>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursor}
          onClick={updateCursor}
          onSelect={updateCursor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          wrap="soft"
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent py-3 pl-[56px] pr-4 text-[13px] leading-[1.6] text-transparent caret-lime-300 outline-none placeholder:text-slate-600 selection:bg-lime-400/20 selection:text-lime-50 disabled:cursor-not-allowed"
          style={{ tabSize: 2, WebkitTextFillColor: "transparent", overflowWrap: "anywhere" }}
        />
      </div>

      {dragActive ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0b1020]/80 backdrop-blur-sm">
          <div className="rounded-sm border border-lime-400/60 bg-[#0b1020] px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-lime-200">
            <FileUp className="mx-auto mb-1 h-5 w-5" />
            Drop to import
          </div>
        </div>
      ) : null}
    </div>
  );
}
