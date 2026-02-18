export const parseThinking = (raw: string) => {
  const xmlStartIndex = raw.indexOf("<think>");
  if (xmlStartIndex !== -1) {
    const preThink = raw.slice(0, xmlStartIndex);
    const xmlEndIndex = raw.indexOf("</think>");
    if (xmlEndIndex === -1) {
      const thinking = raw.slice(xmlStartIndex + 7).trim();
      return { thinking, content: preThink.trim() };
    }
    const thinking = raw.slice(xmlStartIndex + 7, xmlEndIndex).trim();
    const postThink = raw.slice(xmlEndIndex + 8);
    return { thinking, content: (preThink + postThink).trim() };
  }

  const textStartRegex = /^Thinking\.\.\.\s*/i;
  const match = raw.match(textStartRegex);
  if (match && match.index !== undefined) {
    const textEndIndex = raw.indexOf("...done thinking.");

    if (textEndIndex === -1) {
      const thinking = raw.slice(match[0].length).trim();
      return { thinking, content: "" };
    }

    const thinking = raw.slice(match[0].length, textEndIndex).trim();
    const content = raw.slice(textEndIndex + 17).trim();
    return { thinking, content };
  }

  return { thinking: undefined, content: raw };
};
