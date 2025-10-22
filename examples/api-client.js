/**
 * CodeContext Live API Client
 * Simple JavaScript client for interacting with CodeContext Live API
 */

const axios = require('axios');

class CodeContextClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get structured context for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Context digest
   */
  async getContext(filePath) {
    try {
      const response = await this.client.post('/api/context', { filePath });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get Markdown-formatted context summary
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} Markdown summary
   */
  async getContextMarkdown(filePath) {
    try {
      const response = await this.client.post('/api/context/markdown', { filePath });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Manually trigger analysis for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} Markdown summary
   */
  async analyzeFile(filePath) {
    try {
      const response = await this.client.post('/api/analyze', { filePath });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search the vector store
   * @param {string} query - Search query
   * @param {number} topK - Number of results
   * @returns {Promise<Array>} Search results
   */
  async search(query, topK = 5) {
    try {
      const response = await this.client.post('/api/search', { query, topK });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Index a codebase directory
   * @param {Array<string>} directories - Directories to index
   * @returns {Promise<Object>} Indexing status
   */
  async indexCodebase(directories) {
    try {
      const response = await this.client.post('/api/index', { directories });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get server configuration
   * @returns {Promise<Object>} Configuration
   */
  async getConfig() {
    try {
      const response = await this.client.get('/api/config');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check server health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return new Error(`API Error: ${error.response.data.error || error.message}`);
    } else if (error.request) {
      return new Error('No response from server. Is CodeContext Live running?');
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }
}

// Example usage
async function main() {
  const client = new CodeContextClient('http://localhost:3000');

  try {
    // Health check
    console.log('Checking server health...');
    const health = await client.healthCheck();
    console.log('Server status:', health.status);

    // Get configuration
    console.log('\nGetting configuration...');
    const config = await client.getConfig();
    console.log('Config:', JSON.stringify(config, null, 2));

    // Analyze a file
    console.log('\nAnalyzing file...');
    const filePath = './examples/sample-files/SCR100.cbl';
    const markdown = await client.getContextMarkdown(filePath);
    console.log('\n' + markdown);

    // Search for related code
    console.log('\nSearching for related code...');
    const results = await client.search('customer update', 3);
    console.log('Found', results.length, 'related files');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.metadata.fileName}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example if executed directly
if (require.main === module) {
  main();
}

module.exports = CodeContextClient;
