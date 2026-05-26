/**
 * Converts LLM markdown into clean, readable text for BootRise UI (no ** or ## in the chat).
 */

export interface MessageSection {
  title: string;
  content: string;
}

export interface FormattedUserMessage {
  sections: MessageSection[];
  plainEnglish: string | null;
  bodyWithoutSections: string;
}

const SECTION_ALIASES: Record<string, string> = {
  "architectural read": "Architectural read",
  answer: "Answer",
  "plain english": "In plain English",
  "suggested next steps": "Suggested next steps",
  "next steps": "Suggested next steps"
};

export function stripMarkdownForUser(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, " - ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, "").replace(/```/g, "").trim())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSectionTitle(raw: string): string {
  const key = raw.trim().toLowerCase();
  return SECTION_ALIASES[key] ?? raw.trim().replace(/\*\*/g, "");
}

export function parseStructuredMessage(text: string): FormattedUserMessage {
  const cleaned = stripMarkdownForUser(text);
  const sections: MessageSection[] = [];
  let plainEnglish: string | null = null;

  const markdownParts = cleaned.split(/^##\s+(.+)$/gm);
  if (markdownParts.length > 1) {
    for (let i = 1; i < markdownParts.length; i += 2) {
      const title = normalizeSectionTitle(markdownParts[i]);
      const content = markdownParts[i + 1]?.trim() ?? "";
      if (!content) continue;
      if (title.toLowerCase().includes("plain english")) plainEnglish = content;
      else sections.push({ title, content });
    }
    return { sections, plainEnglish, bodyWithoutSections: "" };
  }

  const labelParts = cleaned.split(
    /^(ARCHITECTURAL READ|Architectural read|ANSWER|Answer|PLAIN ENGLISH|Plain English|SUGGESTED NEXT STEPS|Suggested next steps|NEXT STEPS|Next steps)\s*:?\s*$/gim
  );

  if (labelParts.length > 1) {
    for (let i = 1; i < labelParts.length; i += 2) {
      const title = normalizeSectionTitle(labelParts[i]);
      const content = labelParts[i + 1]?.trim() ?? "";
      if (!content) continue;
      if (title.toLowerCase().includes("plain english")) plainEnglish = content;
      else sections.push({ title, content });
    }
    return { sections, plainEnglish, bodyWithoutSections: labelParts[0]?.trim() ?? "" };
  }

  const plainSplit = cleaned.split(/\n(?=In plain English\s*:?\s*)/i);
  if (plainSplit.length > 1) {
    plainEnglish = plainSplit[1].replace(/^In plain English\s*:?\s*/i, "").trim();
    return { sections: [], plainEnglish, bodyWithoutSections: plainSplit[0].trim() };
  }

  return { sections: [], plainEnglish: null, bodyWithoutSections: cleaned };
}

export function formatUserFacingMessage(text: string): string {
  const parsed = parseStructuredMessage(text);
  if (parsed.sections.length === 0) {
    return parsed.plainEnglish ? parsed.bodyWithoutSections : stripMarkdownForUser(text);
  }
  return parsed.sections
    .map((s) => `${s.title}\n${s.content}`)
    .join("\n\n");
}

export function extractPlainEnglishSection(text: string): string | null {
  const parsed = parseStructuredMessage(text);
  return parsed.plainEnglish;
}
