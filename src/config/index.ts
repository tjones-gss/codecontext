import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export type EmbeddingProvider = 'ollama' | 'openai' | 'cohere' | 'none';

export interface Config {
  // Anthropic
  anthropicApiKey: string;

  // Embedding Provider
  embeddingProvider: EmbeddingProvider;

  // Ollama (local - requires powerful machine)
  ollamaBaseUrl: string;
  ollamaModel: string;

  // OpenAI (cloud - lightweight alternative)
  openaiApiKey?: string;
  openaiEmbeddingModel: string;

  // Cohere (cloud - lightweight alternative)
  cohereApiKey?: string;
  cohereEmbeddingModel: string;

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

  // File Watching
  watchExtensions: string[];
}

export const config: Config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  embeddingProvider: (process.env.EMBEDDING_PROVIDER || 'none') as EmbeddingProvider,

  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama2',

  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  cohereApiKey: process.env.COHERE_API_KEY,
  cohereEmbeddingModel: process.env.COHERE_EMBEDDING_MODEL || 'embed-english-light-v3.0',

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

  watchExtensions: process.env.WATCH_EXTENSIONS?.split(',') || ['.cbl', '.vb', '.cs'],
};

export default config;
