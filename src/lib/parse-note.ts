/**
 * Parse note text for @ syntax
 * 
 * Syntax rules:
 * - @company ...text...; → Company-wide note
 * - @task ...text...; → Create a task
 * - No prefix → Personal note for this contact
 * - Multiple @ sections can exist in one note, each ending with ;
 * 
 * Example: "@company They are in UAT migration; @task Follow up on pricing; Called and discussed demo"
 */

export type ParsedSectionType = 'company' | 'task' | 'personal';

export interface ParsedSection {
  type: ParsedSectionType;
  content: string;
}

export interface ParsedNote {
  sections: ParsedSection[];
  hasCompanyNote: boolean;
  hasTasks: boolean;
  taskSections: ParsedSection[];
  companySections: ParsedSection[];
  personalSections: ParsedSection[];
}

/**
 * Parse a note string for @ syntax sections
 */
export function parseNote(text: string): ParsedNote {
  const sections: ParsedSection[] = [];
  
  if (!text || !text.trim()) {
    return {
      sections: [],
      hasCompanyNote: false,
      hasTasks: false,
      taskSections: [],
      companySections: [],
      personalSections: [],
    };
  }

  // Regex to match @company or @task followed by content ending with ;
  // Also captures any text that doesn't start with @ (personal notes)
  const atPattern = /@(company|task)\s+([^;]+);?/gi;
  
  let lastIndex = 0;
  let match;
  
  // Find all @ sections
  const atMatches: { type: ParsedSectionType; content: string; start: number; end: number }[] = [];
  
  while ((match = atPattern.exec(text)) !== null) {
    const type = match[1].toLowerCase() as 'company' | 'task';
    const content = match[2].trim();
    
    if (content) {
      atMatches.push({
        type,
        content,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  
  // Process the text to extract personal notes (text not part of @ sections)
  if (atMatches.length === 0) {
    // No @ sections - entire text is personal
    const trimmed = text.trim();
    if (trimmed) {
      sections.push({ type: 'personal', content: trimmed });
    }
  } else {
    // Extract personal text between/around @ sections
    atMatches.sort((a, b) => a.start - b.start);
    
    for (let i = 0; i <= atMatches.length; i++) {
      const start = i === 0 ? 0 : atMatches[i - 1].end;
      const end = i === atMatches.length ? text.length : atMatches[i].start;
      
      if (start < end) {
        const personalText = text.slice(start, end).trim();
        // Remove leading/trailing semicolons and whitespace
        const cleaned = personalText.replace(/^[;\s]+|[;\s]+$/g, '').trim();
        if (cleaned) {
          sections.push({ type: 'personal', content: cleaned });
        }
      }
      
      // Add the @ section if we're not past the last one
      if (i < atMatches.length) {
        sections.push({
          type: atMatches[i].type,
          content: atMatches[i].content,
        });
      }
    }
  }
  
  // Categorize sections
  const taskSections = sections.filter(s => s.type === 'task');
  const companySections = sections.filter(s => s.type === 'company');
  const personalSections = sections.filter(s => s.type === 'personal');
  
  return {
    sections,
    hasCompanyNote: companySections.length > 0,
    hasTasks: taskSections.length > 0,
    taskSections,
    companySections,
    personalSections,
  };
}

/**
 * Format parsed sections back to display text
 */
export function formatParsedNote(parsed: ParsedNote): string {
  return parsed.sections
    .map(s => {
      switch (s.type) {
        case 'company':
          return `[COMPANY] ${s.content}`;
        case 'task':
          return `[TASK] ${s.content}`;
        default:
          return s.content;
      }
    })
    .join(' | ');
}

/**
 * Check if text contains any @ syntax
 */
export function hasAtSyntax(text: string): boolean {
  return /@(company|task)\s+/i.test(text);
}
