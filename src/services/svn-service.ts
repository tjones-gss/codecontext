import { exec } from 'child_process';
import { promisify } from 'util';
import { SVNInfo, SVNLog } from '../types';
import config from '../config';

const execAsync = promisify(exec);

export class SVNService {
  private svnRepoPath: string;
  private credentials: string;

  constructor() {
    this.svnRepoPath = config.svnRepoPath;
    this.credentials = this.buildCredentials();
  }

  private buildCredentials(): string {
    if (config.svnUsername && config.svnPassword) {
      return `--username ${config.svnUsername} --password ${config.svnPassword} --non-interactive`;
    }
    return '--non-interactive';
  }

  async getFileInfo(filePath: string): Promise<SVNInfo | null> {
    try {
      const logs = await this.getRecentLogs(filePath, 5);

      if (logs.length === 0) {
        return null;
      }

      const latest = logs[0];

      return {
        lastAuthor: latest.author,
        lastRevision: latest.revision,
        lastCommitDate: latest.date,
        lastCommitMessage: latest.message,
        recentLogs: logs,
      };
    } catch (error) {
      console.error(`Error getting SVN info for ${filePath}:`, error);
      return null;
    }
  }

  async getRecentLogs(filePath: string, limit: number = 5): Promise<SVNLog[]> {
    try {
      const command = `svn log -l ${limit} --xml ${this.credentials} "${filePath}"`;
      const { stdout } = await execAsync(command);

      return this.parseSVNLogXML(stdout);
    } catch (error) {
      console.error(`Error getting SVN logs for ${filePath}:`, error);
      return [];
    }
  }

  private parseSVNLogXML(xml: string): SVNLog[] {
    const logs: SVNLog[] = [];

    // Simple XML parsing (in production, use a proper XML parser)
    const logEntryRegex = /<logentry[^>]*revision="([^"]*)">(.*?)<\/logentry>/gs;
    const authorRegex = /<author>(.*?)<\/author>/;
    const dateRegex = /<date>(.*?)<\/date>/;
    const msgRegex = /<msg>(.*?)<\/msg>/s;
    const pathRegex = /<path[^>]*>(.*?)<\/path>/g;

    let match;
    while ((match = logEntryRegex.exec(xml)) !== null) {
      const revision = match[1];
      const content = match[2];

      const authorMatch = authorRegex.exec(content);
      const dateMatch = dateRegex.exec(content);
      const msgMatch = msgRegex.exec(content);

      const files: string[] = [];
      let pathMatch;
      while ((pathMatch = pathRegex.exec(content)) !== null) {
        files.push(pathMatch[1]);
      }

      if (authorMatch && dateMatch) {
        logs.push({
          revision,
          author: authorMatch[1],
          date: new Date(dateMatch[1]),
          message: msgMatch ? msgMatch[1].trim() : '',
          files,
        });
      }
    }

    return logs;
  }

  async searchRelatedFiles(fileName: string): Promise<string[]> {
    try {
      // Search for files that might reference this file
      const baseName = fileName.replace(/\.(cbl|vb|cs)$/i, '');
      const command = `svn list -R ${this.credentials} "${this.svnRepoPath}" | grep -i "${baseName}"`;

      const { stdout } = await execAsync(command);
      return stdout.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error(`Error searching related files for ${fileName}:`, error);
      return [];
    }
  }

  async getFileContent(filePath: string): Promise<string | null> {
    try {
      const command = `svn cat ${this.credentials} "${filePath}"`;
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      console.error(`Error getting file content for ${filePath}:`, error);
      return null;
    }
  }

  async blame(filePath: string): Promise<Map<number, { author: string; revision: string }>> {
    const blameMap = new Map<number, { author: string; revision: string }>();

    try {
      const command = `svn blame ${this.credentials} "${filePath}"`;
      const { stdout } = await execAsync(command);

      const lines = stdout.split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^\s*(\d+)\s+(\S+)/);
        if (match) {
          blameMap.set(index + 1, {
            revision: match[1],
            author: match[2],
          });
        }
      });
    } catch (error) {
      console.error(`Error getting blame for ${filePath}:`, error);
    }

    return blameMap;
  }
}

export default new SVNService();
