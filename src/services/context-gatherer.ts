import fs from 'fs/promises';
import path from 'path';
import { FileContext, ContextDigest, RelatedFile } from '../types';
import svnService from './svn-service';
import codeParser from './code-parser';
import jiraService from './jira-service';
import mondayService from './monday-service';
import vectorStore from './vector-store';
import aiAgent from './ai-agent';
import localAnalyzer from './local-analyzer';
import config from '../config';

export class ContextGatherer {
  async gatherContext(filePath: string): Promise<ContextDigest> {
    console.log(`Gathering context for: ${filePath}`);

    try {
      // 1. Read file content
      const fileContent = await this.readFile(filePath);
      if (!fileContent) {
        throw new Error('Unable to read file');
      }

      // 2. Determine file type
      const fileType = this.getFileType(filePath);

      // 3. Parse code structure
      const parsedCode = codeParser.parseFile(fileContent, fileType);

      // 4. Get SVN information
      const svnInfo = await svnService.getFileInfo(filePath);

      // 5. Extract direct calls
      const directCalls = codeParser.extractCalledPrograms(parsedCode);

      // 6. Find related files (vector similarity + SVN)
      const relatedFiles = await this.findRelatedFiles(filePath, path.basename(filePath));

      // 7. Build file context
      const fileContext: FileContext = {
        filePath,
        fileName: path.basename(filePath),
        fileType,
        lastModified: new Date(),
        svnInfo: svnInfo || undefined,
        relatedFiles,
        directCalls,
        knownConflicts: [],
      };

      // 8. Analyze and create digest (AI or local)
      let digest: ContextDigest;
      if (config.useAI && config.anthropicApiKey) {
        console.log('Using AI-powered analysis (Claude)');
        digest = await aiAgent.analyzeContext(fileContext, parsedCode, fileContent);
      } else {
        console.log('Using local rule-based analysis (no AI)');
        digest = await localAnalyzer.analyzeContext(fileContext, parsedCode, fileContent);
      }

      // 9. Enhance with Jira issues
      digest.jiraIssues = await this.findJiraIssues(filePath, svnInfo?.recentLogs.map(l => l.message).join(' ') || '');

      // 10. Enhance with Monday.com items
      digest.mondayItems = await this.findMondayItems(path.basename(filePath));

      return digest;
    } catch (error) {
      console.error(`Error gathering context for ${filePath}:`, error);
      throw error;
    }
  }

  async generateMarkdownSummary(filePath: string): Promise<string> {
    const digest = await this.gatherContext(filePath);

    // Use appropriate analyzer for markdown generation
    if (config.useAI && config.anthropicApiKey) {
      return await aiAgent.generateMarkdownSummary(digest);
    } else {
      return await localAnalyzer.generateMarkdownSummary(digest);
    }
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      // Try local file first
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      // If local read fails, try SVN
      console.log(`Local read failed, trying SVN for ${filePath}`);
      return await svnService.getFileContent(filePath);
    }
  }

  private getFileType(filePath: string): 'COBOL' | 'VB.NET' | 'C#' | 'UNKNOWN' {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.cbl':
      case '.cob':
      case '.cobol':
        return 'COBOL';
      case '.vb':
        return 'VB.NET';
      case '.cs':
        return 'C#';
      default:
        return 'UNKNOWN';
    }
  }

  private async findRelatedFiles(filePath: string, fileName: string): Promise<RelatedFile[]> {
    const relatedFiles: RelatedFile[] = [];

    try {
      // Vector similarity search
      const similarFiles = await vectorStore.findRelatedFiles(filePath, 5);
      similarFiles.forEach(sf => {
        relatedFiles.push({
          path: sf.path,
          relation: 'data-dependency',
          confidence: sf.score,
        });
      });

      // SVN related files
      const svnRelated = await svnService.searchRelatedFiles(fileName);
      svnRelated.slice(0, 5).forEach(file => {
        if (!relatedFiles.find(rf => rf.path === file)) {
          relatedFiles.push({
            path: file,
            relation: 'includes',
            confidence: 0.5,
          });
        }
      });
    } catch (error) {
      console.error('Error finding related files:', error);
    }

    return relatedFiles;
  }

  private async findJiraIssues(filePath: string, commitMessages: string) {
    if (!jiraService.isEnabled()) {
      return [];
    }

    try {
      const fileName = path.basename(filePath);

      // Extract Jira keys from commit messages
      const jiraKeys = jiraService.extractJiraKeys(commitMessages);

      let issues = [];

      if (jiraKeys.length > 0) {
        issues = await jiraService.getIssuesByKeys(jiraKeys);
      }

      // Also search by filename
      const searchResults = await jiraService.searchIssuesByFile(fileName);
      issues.push(...searchResults);

      // Deduplicate
      const uniqueIssues = Array.from(
        new Map(issues.map(issue => [issue.key, issue])).values()
      );

      return uniqueIssues.slice(0, 5);
    } catch (error) {
      console.error('Error finding Jira issues:', error);
      return [];
    }
  }

  private async findMondayItems(fileName: string) {
    if (!mondayService.isEnabled()) {
      return [];
    }

    try {
      const items = await mondayService.searchItemsByFile(fileName);
      return items.slice(0, 5);
    } catch (error) {
      console.error('Error finding Monday.com items:', error);
      return [];
    }
  }
}

export default new ContextGatherer();
