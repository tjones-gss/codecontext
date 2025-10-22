import express, { Request, Response } from 'express';
import config from './config';
import contextGatherer from './services/context-gatherer';
import fileWatcher from './services/file-watcher';
import vectorStore from './services/vector-store';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Get context for a file
app.post('/api/context', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const digest = await contextGatherer.gatherContext(filePath);

    res.json({
      success: true,
      data: digest,
    });
  } catch (error) {
    console.error('Error in /api/context:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get markdown summary for a file
app.post('/api/context/markdown', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const markdown = await contextGatherer.generateMarkdownSummary(filePath);

    res.json({
      success: true,
      data: markdown,
    });
  } catch (error) {
    console.error('Error in /api/context/markdown:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Manual trigger analysis
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const markdown = await fileWatcher.triggerManualAnalysis(filePath);

    res.json({
      success: true,
      data: markdown,
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Search vector store
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await vectorStore.search(query, topK);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Index codebase
app.post('/api/index', async (req: Request, res: Response) => {
  try {
    const { directories } = req.body;

    if (!directories || !Array.isArray(directories)) {
      return res.status(400).json({ error: 'directories array is required' });
    }

    // Run indexing in background
    vectorStore.indexCodebase(directories).catch(error => {
      console.error('Error indexing codebase:', error);
    });

    res.json({
      success: true,
      message: 'Indexing started in background',
    });
  } catch (error) {
    console.error('Error in /api/index:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get configuration
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      watchExtensions: config.watchExtensions,
      cobolSourceDir: config.cobolSourceDir,
      jiraEnabled: !!config.jiraBaseUrl,
      mondayEnabled: !!config.mondayApiToken,
    },
  });
});

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.port, config.host, () => {
      console.log(`CodeContext Live server running at http://${config.host}:${config.port}`);
      resolve();
    });
  });
}

export default app;
