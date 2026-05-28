"use client";

import { useState } from "react";

export interface FileNode {
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  changed?: boolean;
}

interface RepoFileExplorerProps {
  files: FileNode[];
  onSelect: (path: string) => void;
  selectedPath?: string;
}

export function RepoFileExplorer({ files, onSelect, selectedPath }: RepoFileExplorerProps) {
  return (
    <div className="h-full overflow-hidden bg-panel-ws text-text-ws-2">
      <div className="border-b border-border-ws px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Files</div>
      <div className="h-[calc(100%-37px)] overflow-y-auto overflow-x-hidden py-2">
        {files.length === 0 ? (
          <p className="px-3 py-4 text-xs text-text-ws-3">No repo files loaded yet.</p>
        ) : (
          files.map((node) => <TreeNode key={node.path} node={node} depth={0} onSelect={onSelect} selectedPath={selectedPath} />)
        )}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onSelect,
  selectedPath
}: {
  node: FileNode;
  depth: number;
  onSelect: (path: string) => void;
  selectedPath?: string;
}) {
  const [open, setOpen] = useState(depth <= 1);
  const isDir = node.type === "dir";
  const selected = selectedPath === node.path;
  const label = node.path.split("/").filter(Boolean).pop() ?? node.path;

  return (
    <div>
      <button
        type="button"
        title={node.path}
        onClick={() => (isDir ? setOpen((value) => !value) : onSelect(node.path))}
        className={`flex h-7 w-full items-center gap-2 truncate px-2 text-left font-mono text-xs transition ${
          selected ? "bg-signal-glow text-signal-text" : node.changed ? "text-amber-300" : "text-text-ws-2 hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="w-3 shrink-0 text-[10px] text-text-ws-3">{isDir ? (open ? "-" : "+") : fileGlyph(label)}</span>
        <span className="truncate">{label}</span>
        {node.changed ? <span aria-hidden className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> : null}
      </button>
      {isDir && open ? (node.children ?? []).map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />) : null}
    </div>
  );
}

function fileGlyph(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") return "ts";
  if (ext === "css") return "cs";
  if (ext === "json") return "js";
  if (ext === "md") return "md";
  return "--";
}

