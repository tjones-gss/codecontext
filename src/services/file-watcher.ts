import chokidar from 'chokidar';
import path from 'path';
import config from '../config';
import contextGatherer from './context-gatherer';

export type FileOpenCallback = (filePath: string, context: string) => void;

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private callbacks: FileOpenCallback[] = [];

  async start(directories: string[]) {
    const patterns = this.buildWatchPatterns(directories);

    console.log('Starting file watcher...');
    console.log('Watching patterns:', patterns);

    this.watcher = chokidar.watch(patterns, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', async filePath => {
        console.log(`File opened/created: ${filePath}`);
        await this.handleFileOpen(filePath);
      })
      .on('change', async filePath => {
        console.log(`File changed: ${filePath}`);
        await this.handleFileOpen(filePath);
      })
      .on('error', error => {
        console.error('File watcher error:', error);
      });

    console.log('File watcher started successfully');
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('File watcher stopped');
    }
  }

  onFileOpen(callback: FileOpenCallback) {
    this.callbacks.push(callback);
  }

  private async handleFileOpen(filePath: string) {
    try {
      const markdown = await contextGatherer.generateMarkdownSummary(filePath);

      // Notify all registered callbacks
      this.callbacks.forEach(callback => {
        callback(filePath, markdown);
      });
    } catch (error) {
      console.error(`Error handling file open for ${filePath}:`, error);
    }
  }

  private buildWatchPatterns(directories: string[]): string[] {
    const patterns: string[] = [];

    directories.forEach(dir => {
      config.watchExtensions.forEach(ext => {
        patterns.push(path.join(dir, `**/*${ext}`));
      });
    });

    return patterns;
  }

  async triggerManualAnalysis(filePath: string): Promise<string> {
    console.log(`Manual analysis triggered for: ${filePath}`);
    return await contextGatherer.generateMarkdownSummary(filePath);
  }
}

export default new FileWatcher();
