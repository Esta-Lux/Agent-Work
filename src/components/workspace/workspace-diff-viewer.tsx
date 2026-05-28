import { CommandButton } from "@/components/ui/command-button";

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

interface WorkspaceDiffViewerProps {
  diff: DiffFile[];
  onApprove?: () => void;
  onReject?: () => void;
}

export function WorkspaceDiffViewer({ diff, onApprove, onReject }: WorkspaceDiffViewerProps) {
  if (diff.length === 0) {
    return <div className="p-6 text-sm text-text-ws-3">No diff generated yet.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {diff.map((file) => {
        const added = file.hunks.flatMap((hunk) => hunk.lines).filter((line) => line.type === "add").length;
        const removed = file.hunks.flatMap((hunk) => hunk.lines).filter((line) => line.type === "remove").length;
        return (
          <article key={file.path} className="overflow-hidden rounded-lg border border-border-ws bg-panel-ws">
            <div className="flex items-center justify-between gap-3 border-b border-border-ws bg-card-ws px-3 py-2">
              <p className="truncate font-mono text-xs font-medium text-text-ws-1">{file.path}</p>
              <span className="font-mono text-[10px] text-text-ws-3">+{added} / -{removed}</span>
            </div>
            <div className="overflow-x-auto font-mono text-xs">
              {file.hunks.map((hunk) => (
                <div key={`${file.path}-${hunk.header}`}>
                  <div className="bg-white/5 px-3 py-1 text-text-ws-3">{hunk.header}</div>
                  {hunk.lines.map((line, index) => (
                    <div key={`${hunk.header}-${index}`} className={`px-3 py-0.5 ${lineClass(line.type)}`}>
                      <span className="mr-2 select-none">{line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}</span>
                      {line.content}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>
        );
      })}
      {onApprove && onReject ? (
        <div className="flex justify-end gap-2">
          <CommandButton theme="workspace" variant="secondary" size="md" label="Reject" onClick={onReject} />
          <CommandButton theme="workspace" variant="primary" size="md" label="Approve patch" onClick={onApprove} />
        </div>
      ) : null}
    </div>
  );
}

function lineClass(type: DiffLine["type"]): string {
  if (type === "add") return "bg-signal-glow text-signal-text";
  if (type === "remove") return "bg-red-400/10 text-red-400";
  return "text-text-ws-3";
}

