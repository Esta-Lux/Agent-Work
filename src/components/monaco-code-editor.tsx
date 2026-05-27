"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { languageFromPath } from "@/lib/editor/monaco-language";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-line bg-cloud text-xs text-steel">
      Loading editor…
    </div>
  )
});

export function MonacoCodeEditor({
  path,
  value,
  onChange,
  readOnly = false,
  height = "min(36vh, 360px)"
}: {
  path: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}) {
  const language = useMemo(() => languageFromPath(path), [path]);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line">
      <p className="border-b border-line bg-cloud px-2 py-1 font-mono text-[10px] text-steel">{path}</p>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        theme="vs"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2
        }}
        onChange={(next) => {
          if (!readOnly && onChange) onChange(next ?? "");
        }}
      />
    </div>
  );
}
