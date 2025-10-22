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

  async initialize() {
    await this.loadIndex();
  }

  async addDocument(id: string, content: string, metadata: Record<string, any>) {
    const embedding = await this.generateEmbedding(content);

    const doc: Document = {
      id,
      content,
      metadata,
      embedding,
    };

    this.documents.set(id, doc);
    await this.saveIndex();
  }

  async search(query: string, topK: number = 5): Promise<Document[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      return [];
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

    if (!doc || !doc.embedding) {
      return [];
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
      const response = await this.ollamaClient.post('/api/embeddings', {
        model: config.ollamaModel,
        prompt: text,
      });

      return response.data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
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
}

export default new VectorStore();
