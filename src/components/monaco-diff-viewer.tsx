"use client";

import dynamic from "next/dynamic";
import { languageFromPath } from "@/lib/editor/monaco-language";

const DiffEditor = dynamic(
  async () => {
    const mod = await import("@monaco-editor/react");
    return mod.DiffEditor;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-line bg-cloud text-xs text-steel">
        Loading diff…
      </div>
    )
  }
);

export function MonacoDiffViewer({
  path,
  before,
  after,
  height = 280
}: {
  path: string;
  before: string;
  after: string;
  height?: number | string;
}) {
  const language = languageFromPath(path);

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <p className="border-b border-line bg-cloud px-2 py-1 font-mono text-[10px] text-steel">{path}</p>
      <DiffEditor
        height={height}
        language={language}
        original={before}
        modified={after}
        theme="vs"
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          fontSize: 11,
          scrollBeyondLastLine: false,
          automaticLayout: true
        }}
      />
    </div>
  );
}
