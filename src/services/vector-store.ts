import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../config';

interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export class VectorStore {
  private documents: Map<string, Document> = new Map();
  private ollamaClient = axios.create({
    baseURL: config.ollamaBaseUrl,
  });
  private embeddingEnabled: boolean;

  constructor() {
    this.embeddingEnabled = config.embeddingProvider !== 'none';

    if (this.embeddingEnabled) {
      console.log(`Using embedding provider: ${config.embeddingProvider}`);
    } else {
      console.log('Embeddings disabled - using keyword-based search fallback');
    }
  }

  async initialize() {
    await this.loadIndex();
  }

  async addDocument(id: string, content: string, metadata: Record<string, any>) {
    let embedding: number[] | null = null;

    if (this.embeddingEnabled) {
      embedding = await this.generateEmbedding(content);
    }

    const doc: Document = {
      id,
      content,
      metadata,
      embedding: embedding || undefined,
    };

    this.documents.set(id, doc);
    await this.saveIndex();
  }

  async search(query: string, topK: number = 5): Promise<Document[]> {
    if (!this.embeddingEnabled || this.documents.size === 0) {
      // Fallback to keyword search
      return this.keywordSearch(query, topK);
    }

    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      return this.keywordSearch(query, topK);
    }

    const results: Array<{ doc: Document; score: number }> = [];

    for (const doc of this.documents.values()) {
      if (!doc.embedding) continue;

      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ doc, score });
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map(r => r.doc);
  }

  async findRelatedFiles(filePath: string, topK: number = 10): Promise<Array<{ path: string; score: number }>> {
    const doc = this.documents.get(filePath);

    if (!doc) {
      return [];
    }

    if (!this.embeddingEnabled || !doc.embedding) {
      // Fallback to keyword-based similarity
      return this.keywordBasedRelatedFiles(filePath, topK);
    }

    const results: Array<{ path: string; score: number }> = [];

    for (const [path, otherDoc] of this.documents.entries()) {
      if (path === filePath || !otherDoc.embedding) continue;

      const score = this.cosineSimilarity(doc.embedding, otherDoc.embedding);
      results.push({ path, score });
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      switch (config.embeddingProvider) {
        case 'ollama':
          return await this.generateOllamaEmbedding(text);
        case 'openai':
          return await this.generateOpenAIEmbedding(text);
        case 'cohere':
          return await this.generateCohereEmbedding(text);
        case 'none':
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error generating embedding with ${config.embeddingProvider}:`, error);
      return null;
    }
  }

  private async generateOllamaEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.ollamaClient.post('/api/embeddings', {
        model: config.ollamaModel,
        prompt: text,
      });

      return response.data.embedding;
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw error;
    }
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[] | null> {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: config.openaiEmbeddingModel,
          input: text.substring(0, 8000), // OpenAI has token limits
        },
        {
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  private async generateCohereEmbedding(text: string): Promise<number[] | null> {
    if (!config.cohereApiKey) {
      throw new Error('Cohere API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.cohere.ai/v1/embed',
        {
          model: config.cohereEmbeddingModel,
          texts: [text.substring(0, 8000)], // Cohere has limits too
          truncate: 'END',
        },
        {
          headers: {
            'Authorization': `Bearer ${config.cohereApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.embeddings[0];
    } catch (error) {
      console.error('Cohere embedding error:', error);
      throw error;
    }
  }

  private keywordSearch(query: string, topK: number): Document[] {
    const queryTokens = this.tokenize(query.toLowerCase());
    const results: Array<{ doc: Document; score: number }> = [];

    for (const doc of this.documents.values()) {
      const contentTokens = this.tokenize(doc.content.toLowerCase());
      const score = this.calculateKeywordScore(queryTokens, contentTokens);

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK).map(r => r.doc);
  }

  private keywordBasedRelatedFiles(filePath: string, topK: number): Array<{ path: string; score: number }> {
    const doc = this.documents.get(filePath);
    if (!doc) return [];

    const sourceTokens = this.tokenize(doc.content.toLowerCase());
    const results: Array<{ path: string; score: number }> = [];

    for (const [path, otherDoc] of this.documents.entries()) {
      if (path === filePath) continue;

      const targetTokens = this.tokenize(otherDoc.content.toLowerCase());
      const score = this.calculateKeywordScore(sourceTokens, targetTokens);

      if (score > 0) {
        results.push({ path, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private tokenize(text: string): Set<string> {
    // Simple tokenization - split on non-alphanumeric, remove common words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    const tokens = text
      .split(/[^a-z0-9]+/)
      .filter(token => token.length > 2 && !stopWords.has(token));

    return new Set(tokens);
  }

  private calculateKeywordScore(tokensA: Set<string>, tokensB: Set<string>): number {
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    // Calculate Jaccard similarity
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);

    return intersection.size / union.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async loadIndex() {
    try {
      const indexPath = path.join(config.vectorStorePath, 'index.json');
      const data = await fs.readFile(indexPath, 'utf-8');
      const parsed = JSON.parse(data);

      this.documents = new Map(Object.entries(parsed));
      console.log(`Loaded ${this.documents.size} documents from vector store`);
    } catch (error) {
      console.log('No existing vector store found, starting fresh');
    }
  }

  private async saveIndex() {
    try {
      await fs.mkdir(config.vectorStorePath, { recursive: true });

      const indexPath = path.join(config.vectorStorePath, 'index.json');
      const data = Object.fromEntries(this.documents);

      await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving vector store:', error);
    }
  }

  async indexCodebase(sourceDirs: string[]) {
    console.log('Indexing codebase...');

    for (const dir of sourceDirs) {
      await this.indexDirectory(dir);
    }

    console.log(`Indexed ${this.documents.size} files`);
  }

  private async indexDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath);
        } else if (this.shouldIndexFile(entry.name)) {
          await this.indexFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error indexing directory ${dir}:`, error);
    }
  }

  private shouldIndexFile(fileName: string): boolean {
    return config.watchExtensions.some(ext => fileName.endsWith(ext));
  }

  private async indexFile(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      await this.addDocument(filePath, content, {
        fileName: path.basename(filePath),
        directory: path.dirname(filePath),
        extension: path.extname(filePath),
        indexedAt: new Date().toISOString(),
      });

      console.log(`Indexed: ${filePath}`);
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
    }
  }

  isEmbeddingEnabled(): boolean {
    return this.embeddingEnabled;
  }

  getProvider(): string {
    return config.embeddingProvider;
  }
}

export default new VectorStore();
