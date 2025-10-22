import Anthropic from '@anthropic-ai/sdk';
import { ContextDigest, FileContext, ParsedCode } from '../types';
import config from '../config';

export class AIAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async analyzeContext(fileContext: FileContext, parsedCode: ParsedCode, fileContent: string): Promise<ContextDigest> {
    const systemPrompt = `You are "CodeContext Live," an agent that reads the currently open file and retrieves related functions, comments, and historical notes from SVN logs and local directories. Summarize key logic, dependencies, and last modified reasons in human-readable language.

Your task is to create a concise context digest that helps developers understand:
1. What this code does (primary purpose)
2. Who last modified it and why
3. What other programs/modules it calls or depends on
4. Any known data conflicts or issues
5. Recent changes and their reasoning

Be specific and technical, but keep explanations clear and actionable.`;

    const userPrompt = this.buildAnalysisPrompt(fileContext, parsedCode, fileContent);

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      return this.parseResponse(responseText, fileContext);
    } catch (error) {
      console.error('Error analyzing context with AI:', error);
      return this.createFallbackDigest(fileContext);
    }
  }

  private buildAnalysisPrompt(fileContext: FileContext, parsedCode: ParsedCode, fileContent: string): string {
    let prompt = `File opened: ${fileContext.fileName} (${fileContext.filePath})\n\n`;

    // SVN Information
    if (fileContext.svnInfo) {
      prompt += `## SVN Information\n`;
      prompt += `- Last Modified By: ${fileContext.svnInfo.lastAuthor}\n`;
      prompt += `- Last Commit: ${fileContext.svnInfo.lastCommitDate.toISOString()}\n`;
      prompt += `- Revision: ${fileContext.svnInfo.lastRevision}\n`;
      prompt += `- Last Commit Message: ${fileContext.svnInfo.lastCommitMessage}\n\n`;

      if (fileContext.svnInfo.recentLogs.length > 0) {
        prompt += `## Recent Change History\n`;
        fileContext.svnInfo.recentLogs.slice(0, 3).forEach(log => {
          prompt += `- [${log.revision}] ${log.author} (${log.date.toLocaleDateString()}): ${log.message}\n`;
        });
        prompt += '\n';
      }
    }

    // Parsed Code Structure
    if (parsedCode.functions.length > 0) {
      prompt += `## Functions/Sections Found (${parsedCode.functions.length})\n`;
      parsedCode.functions.slice(0, 10).forEach(func => {
        prompt += `- ${func.name}`;
        if (func.calls.length > 0) {
          prompt += ` -> calls: ${func.calls.join(', ')}`;
        }
        prompt += '\n';
      });
      prompt += '\n';
    }

    if (parsedCode.dependencies.length > 0) {
      prompt += `## External Dependencies\n`;
      prompt += parsedCode.dependencies.join(', ') + '\n\n';
    }

    if (parsedCode.dataStructures.length > 0) {
      prompt += `## Data Structures (${parsedCode.dataStructures.length})\n`;
      parsedCode.dataStructures.slice(0, 5).forEach(ds => {
        prompt += `- ${ds.name} (${ds.type})\n`;
      });
      prompt += '\n';
    }

    // Related Files
    if (fileContext.relatedFiles.length > 0) {
      prompt += `## Related Files\n`;
      fileContext.relatedFiles.forEach(rf => {
        prompt += `- ${rf.path} (${rf.relation})\n`;
      });
      prompt += '\n';
    }

    // Code Comments
    if (parsedCode.comments.length > 0) {
      prompt += `## Key Comments from Code\n`;
      parsedCode.comments.slice(0, 5).forEach(comment => {
        prompt += `- Line ${comment.line}: ${comment.text}\n`;
      });
      prompt += '\n';
    }

    prompt += `## File Preview (first 50 lines)\n\`\`\`\n${fileContent.split('\n').slice(0, 50).join('\n')}\n\`\`\`\n\n`;

    prompt += `Please provide a comprehensive context digest with the following sections:
1. **Last Modified By**: Who and when
2. **Primary Purpose**: What this module does (2-3 sentences)
3. **Direct Calls**: What programs/functions this calls
4. **Known Data Conflicts**: Any potential issues or conflicts (if evident)
5. **Recent Changes Summary**: Why recent changes were made

Format your response in Markdown.`;

    return prompt;
  }

  private parseResponse(responseText: string, fileContext: FileContext): ContextDigest {
    // Extract structured information from Claude's response
    return {
      lastModifiedBy: fileContext.svnInfo?.lastAuthor || 'Unknown',
      lastModifiedDate: fileContext.svnInfo?.lastCommitDate.toLocaleDateString() || 'Unknown',
      primaryPurpose: this.extractSection(responseText, 'Primary Purpose') || 'Analysis in progress',
      directCalls: fileContext.directCalls,
      knownDataConflicts: this.extractListItems(responseText, 'Known Data Conflicts'),
      relatedFiles: fileContext.relatedFiles.map(rf => rf.path),
      recentChanges: fileContext.svnInfo?.recentLogs.map(log => `${log.message} (${log.author})`) || [],
      jiraIssues: [],
      mondayItems: [],
      additionalNotes: [responseText],
    };
  }

  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([^\\n]+(?:\\n(?!\\*\\*)[^\\n]+)*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractListItems(text: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
    const sectionMatch = text.match(sectionRegex);

    if (!sectionMatch) return [];

    const listItems = sectionMatch[1].match(/^\\s*[-*]\\s*(.+)$/gm);
    return listItems ? listItems.map(item => item.replace(/^\\s*[-*]\\s*/, '').trim()) : [];
  }

  private createFallbackDigest(fileContext: FileContext): ContextDigest {
    return {
      lastModifiedBy: fileContext.svnInfo?.lastAuthor || 'Unknown',
      lastModifiedDate: fileContext.svnInfo?.lastCommitDate.toLocaleDateString() || 'Unknown',
      primaryPurpose: 'Unable to analyze - AI service unavailable',
      directCalls: fileContext.directCalls,
      knownDataConflicts: [],
      relatedFiles: fileContext.relatedFiles.map(rf => rf.path),
      recentChanges: fileContext.svnInfo?.recentLogs.map(log => `${log.message} (${log.author})`) || [],
      jiraIssues: [],
      mondayItems: [],
      additionalNotes: [],
    };
  }

  async generateMarkdownSummary(digest: ContextDigest): Promise<string> {
    let markdown = '# Code Context Summary\n\n';

    markdown += `## Last Modified\n`;
    markdown += `**By:** ${digest.lastModifiedBy}  \n`;
    markdown += `**Date:** ${digest.lastModifiedDate}\n\n`;

    markdown += `## Primary Purpose\n`;
    markdown += `${digest.primaryPurpose}\n\n`;

    if (digest.directCalls.length > 0) {
      markdown += `## Direct Calls\n`;
      digest.directCalls.forEach(call => {
        markdown += `- \`${call}\`\n`;
      });
      markdown += '\n';
    }

    if (digest.knownDataConflicts.length > 0) {
      markdown += `## Known Data Conflicts\n`;
      digest.knownDataConflicts.forEach(conflict => {
        markdown += `- ${conflict}\n`;
      });
      markdown += '\n';
    }

    if (digest.relatedFiles.length > 0) {
      markdown += `## Related Files\n`;
      digest.relatedFiles.slice(0, 10).forEach(file => {
        markdown += `- ${file}\n`;
      });
      markdown += '\n';
    }

    if (digest.recentChanges.length > 0) {
      markdown += `## Recent Changes\n`;
      digest.recentChanges.slice(0, 5).forEach(change => {
        markdown += `- ${change}\n`;
      });
      markdown += '\n';
    }

    if (digest.jiraIssues.length > 0) {
      markdown += `## Related Jira Issues\n`;
      digest.jiraIssues.forEach(issue => {
        markdown += `- [${issue.key}](${issue.url}): ${issue.summary} (${issue.status})\n`;
      });
      markdown += '\n';
    }

    if (digest.mondayItems.length > 0) {
      markdown += `## Related Monday.com Items\n`;
      digest.mondayItems.forEach(item => {
        markdown += `- [${item.name}](${item.url})\n`;
      });
      markdown += '\n';
    }

    if (digest.additionalNotes.length > 0) {
      markdown += `## Additional Analysis\n`;
      digest.additionalNotes.forEach(note => {
        markdown += `${note}\n\n`;
      });
    }

    markdown += `---\n`;
    markdown += `*Generated by CodeContext Live*\n`;

    return markdown;
  }
}

export default new AIAgent();
