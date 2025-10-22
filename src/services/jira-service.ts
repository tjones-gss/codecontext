import axios, { AxiosInstance } from 'axios';
import { JiraIssue } from '../types';
import config from '../config';

export class JiraService {
  private client: AxiosInstance | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = !!(config.jiraBaseUrl && config.jiraEmail && config.jiraApiToken);

    if (this.enabled) {
      this.client = axios.create({
        baseURL: config.jiraBaseUrl,
        auth: {
          username: config.jiraEmail!,
          password: config.jiraApiToken!,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async searchIssuesByFile(fileName: string): Promise<JiraIssue[]> {
    if (!this.enabled || !this.client) {
      return [];
    }

    try {
      const jql = `text ~ "${fileName}" OR summary ~ "${fileName}" OR description ~ "${fileName}" ORDER BY updated DESC`;

      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql,
          maxResults: 10,
          fields: 'key,summary,status',
        },
      });

      return response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        url: `${config.jiraBaseUrl}/browse/${issue.key}`,
      }));
    } catch (error) {
      console.error('Error searching Jira issues:', error);
      return [];
    }
  }

  async getIssuesByKeys(keys: string[]): Promise<JiraIssue[]> {
    if (!this.enabled || !this.client || keys.length === 0) {
      return [];
    }

    try {
      const jql = `key in (${keys.join(',')})`;

      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql,
          fields: 'key,summary,status',
        },
      });

      return response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        url: `${config.jiraBaseUrl}/browse/${issue.key}`,
      }));
    } catch (error) {
      console.error('Error fetching Jira issues:', error);
      return [];
    }
  }

  extractJiraKeys(text: string): string[] {
    const jiraKeyRegex = /[A-Z]{2,}-\d+/g;
    const matches = text.match(jiraKeyRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new JiraService();
