/** Close a fence that is still open so streaming markdown can render. */
export function closeDanglingFence(markdown: string): string {
  let fences = 0;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      fences += 1;
    }
  }
  if (fences % 2 === 1) {
    return `${markdown}\n\`\`\``;
  }
  return markdown;
}
