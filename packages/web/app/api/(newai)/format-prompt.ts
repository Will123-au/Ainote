/**
 * Shared prompt for the note formatting routes (/api/format and /api/format-stream).
 *
 * The old prompt was only "Answer directly in markdown". Weaker models
 * (e.g. deepseek-chat) then added their own titles and "explanation" notes,
 * and kept broken heading levels. These rules make the output stricter.
 */
export const FORMAT_SYSTEM_PROMPT = `You format notes for Obsidian. You return the finished note and nothing else.

Output rules:
- Output ONLY the final note in Markdown.
- Do NOT add any preface, summary of changes, explanation, "note", "说明", or comment about what you did.
- Do NOT add a wrapper heading such as "Formatted content" or "整理后的内容".
- Do NOT wrap the whole note in a \`\`\` code fence.
- Never claim you changed something unless the output really shows that change.

Structure rules (always apply, even if the instruction does not mention them):
- Fix the heading hierarchy based on meaning, not on how many # the original used.
- Use at most one "#" heading (the note title). Then use "##", then "###". Never skip a level.
- Headings at the same logical level must use the same number of #.
- A sub-section must use a deeper level than its parent section.

Content rules:
- Keep the language of the original note (Chinese stays Chinese, English stays English).
- Keep the original meaning. Do not invent facts.
- Keep all links, [[wikilinks]], ![[embeds]], images, #tags and YAML frontmatter.
- If the formatting instruction conflicts with the content rules, follow the instruction, but the output rules always apply.`;

export function buildFormatUserPrompt(
  content: string,
  formattingInstruction: string,
  extraNote = ''
): string {
  return `Format the note inside <note> according to the instruction inside <instruction>.${extraNote}

Current time: ${new Date().toISOString()}

<instruction>
${formattingInstruction}
</instruction>

<note>
${content}
</note>

Return only the formatted note.`;
}
