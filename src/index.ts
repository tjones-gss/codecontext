import config from './config';
import { startServer } from './server';
import vectorStore from './services/vector-store';
import fileWatcher from './services/file-watcher';

async function main() {
  console.log('===========================================');
  console.log('   CodeContext Live - Starting Up');
  console.log('===========================================\n');

  try {
    // Display mode
    console.log('Configuration:');
    if (config.useAI) {
      if (config.anthropicApiKey) {
        console.log('  ✅ AI Mode: ENABLED (using Claude for analysis)');
      } else {
        console.warn('  ⚠️  AI Mode: ENABLED but ANTHROPIC_API_KEY not set!');
        console.warn('      Falling back to local analysis.');
      }
    } else {
      console.log('  ✅ AI Mode: DISABLED (using local rule-based analysis)');
      console.log('      100% local, no external APIs, completely FREE!');
    }
    console.log(`  ℹ️  Embedding Provider: ${config.embeddingProvider}`);
    console.log('');

    // Initialize vector store
    console.log('Initializing vector store...');
    await vectorStore.initialize();
    console.log('Vector store initialized\n');

    // Start file watcher
    const watchDirs = [
      config.cobolSourceDir,
      ...config.additionalSourceDirs,
    ].filter(dir => dir && dir.trim() !== '');

    if (watchDirs.length > 0) {
      console.log('Starting file watcher for directories:');
      watchDirs.forEach(dir => console.log(`  - ${dir}`));
      await fileWatcher.start(watchDirs);
      console.log('');
    } else {
      console.log('No directories configured for watching. Set COBOL_SOURCE_DIR in .env\n');
    }

    // Set up file watcher callback
    fileWatcher.onFileOpen((filePath, context) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Context generated for: ${filePath}`);
      console.log('='.repeat(60));
      console.log(context);
      console.log('='.repeat(60) + '\n');
    });

    // Start API server
    await startServer();

    console.log('\n===========================================');
    console.log('   CodeContext Live is running!');
    console.log('===========================================');
    console.log(`\nAPI Endpoints:`);
    console.log(`  - POST http://${config.host}:${config.port}/api/context`);
    console.log(`  - POST http://${config.host}:${config.port}/api/context/markdown`);
    console.log(`  - POST http://${config.host}:${config.port}/api/analyze`);
    console.log(`  - POST http://${config.host}:${config.port}/api/search`);
    console.log(`  - POST http://${config.host}:${config.port}/api/index`);
    console.log(`  - GET  http://${config.host}:${config.port}/api/config`);
    console.log(`\nPress Ctrl+C to stop\n`);
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down CodeContext Live...');
  fileWatcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down CodeContext Live...');
  fileWatcher.stop();
  process.exit(0);
});

// Start the application
main();
