import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  // Anthropic
  anthropicApiKey: string;

  // Ollama
  ollamaBaseUrl: string;
  ollamaModel: string;

  // SVN
  svnRepoPath: string;
  svnUsername?: string;
  svnPassword?: string;

  // Jira
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;

  // Monday.com
  mondayApiToken?: string;
  mondayApiUrl: string;

  // Source Directories
  cobolSourceDir: string;
  additionalSourceDirs: string[];

  // Server
  port: number;
  host: string;

  // Vector Store
  vectorStorePath: string;
  embeddingModel: string;

  // File Watching
  watchExtensions: string[];
}

export const config: Config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama2',

  svnRepoPath: process.env.SVN_REPO_PATH || '',
  svnUsername: process.env.SVN_USERNAME,
  svnPassword: process.env.SVN_PASSWORD,

  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraApiToken: process.env.JIRA_API_TOKEN,

  mondayApiToken: process.env.MONDAY_API_TOKEN,
  mondayApiUrl: process.env.MONDAY_API_URL || 'https://api.monday.com/v2',

  cobolSourceDir: process.env.COBOL_SOURCE_DIR || '',
  additionalSourceDirs: process.env.ADDITIONAL_SOURCE_DIRS?.split(',') || [],

  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  vectorStorePath: process.env.VECTOR_STORE_PATH || './data/vector_store',
  embeddingModel: process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2',

  watchExtensions: process.env.WATCH_EXTENSIONS?.split(',') || ['.cbl', '.vb', '.cs'],
};

export default config;
