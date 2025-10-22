# CodeContext Live

**Live contextual intelligence for COBOL, VB.NET, and C# files**

CodeContext Live is an AI-powered system that surfaces real-time contextual intelligence about any file being edited. It integrates with SVN, Jira, Monday.com, and uses Claude AI to provide developers with comprehensive context about their code.

## Features

- **File Monitoring**: Automatically detects when COBOL, VB.NET, or C# files are opened/modified
- **SVN Integration**: Pulls commit history, blame information, and related files
- **Code Analysis**: Parses code structure to identify functions, calls, and dependencies
- **AI-Powered Insights**: Uses Claude AI to generate human-readable context summaries
- **Vector Store**: Semantic search across your codebase using embeddings
- **Jira Integration**: Links code changes to Jira issues
- **Monday.com Integration**: Connects code to project management items
- **REST API**: Easy integration with editors like Cursor, VSCode, or custom tools

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CodeContext Live                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ File Watcher │───▶│   Context    │───▶│  AI Agent    │  │
│  │   Service    │    │   Gatherer   │    │  (Claude)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                                │
│          ┌──────────────────┼──────────────────┐            │
│          ▼                  ▼                  ▼            │
│  ┌──────────────┐    ┌──────────────┐  ┌──────────────┐   │
│  │ SVN Service  │    │ Code Parser  │  │ Vector Store │   │
│  └──────────────┘    └──────────────┘  └──────────────┘   │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │ Jira Service │    │Monday Service│                      │
│  └──────────────┘    └──────────────┘                      │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              REST API Server                     │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- TypeScript
- SVN command-line tools
- [Ollama](https://ollama.ai/) (for local embeddings)
- Anthropic API key (for Claude)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd codecontext
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

5. Start Ollama (in a separate terminal):
```bash
ollama serve
ollama pull llama2
```

6. Start CodeContext Live:
```bash
npm start
```

The server will start at `http://localhost:3000`

## Configuration

Edit `.env` file with your settings:

```env
# Required
ANTHROPIC_API_KEY=your_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# SVN Configuration
SVN_REPO_PATH=\\\\LocalCobolSearch\\trunk\\cobol\\fujsource
SVN_USERNAME=your_username
SVN_PASSWORD=your_password

# Optional: Jira Integration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_token

# Optional: Monday.com Integration
MONDAY_API_TOKEN=your_monday_token

# Source Directories
COBOL_SOURCE_DIR=\\\\LocalCobolSearch\\trunk\\cobol\\fujsource
ADDITIONAL_SOURCE_DIRS=/path/to/other,/path/to/more

# File Extensions to Watch
WATCH_EXTENSIONS=.cbl,.vb,.cs
```

## API Endpoints

### POST /api/context
Get structured context for a file.

**Request:**
```json
{
  "filePath": "/path/to/SCR100.cbl"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lastModifiedBy": "John Smith",
    "lastModifiedDate": "2024-01-15",
    "primaryPurpose": "Customer account screen handler...",
    "directCalls": ["DBREAD", "DBUPDAT", "AUDITLOG"],
    "knownDataConflicts": [],
    "relatedFiles": ["CUSTDB", "SCR100M"],
    "recentChanges": ["Fixed bug in customer lookup..."],
    "jiraIssues": [...],
    "mondayItems": [...]
  }
}
```

### POST /api/context/markdown
Get Markdown-formatted context summary.

**Request:**
```json
{
  "filePath": "/path/to/SCR100.cbl"
}
```

**Response:**
```json
{
  "success": true,
  "data": "# Code Context Summary\n\n## Last Modified\n..."
}
```

### POST /api/analyze
Manually trigger analysis for a file.

### POST /api/search
Search the vector store for related code.

**Request:**
```json
{
  "query": "customer update logic",
  "topK": 5
}
```

### POST /api/index
Index a codebase directory.

**Request:**
```json
{
  "directories": ["/path/to/source"]
}
```

## Integration with Cursor/VSCode

See `examples/cursor-extension/extension.js` for a complete example of integrating CodeContext Live with Cursor or VSCode.

### Quick Integration

```javascript
const axios = require('axios');

// When a file is opened
async function onFileOpen(filePath) {
  const response = await axios.post('http://localhost:3000/api/context/markdown', {
    filePath
  });

  const markdown = response.data.data;
  // Display markdown in a side panel
  displayInSidePanel(markdown);
}
```

## Example Output

When you open `SCR100.cbl`, CodeContext Live generates:

```markdown
# Code Context Summary

## Last Modified
**By:** John Smith
**Date:** 1/15/2024

## Primary Purpose
Customer account screen handler that processes customer inquiries and updates.
Integrates with CICS for screen management and calls database utilities for
data access. Includes security validation and audit logging.

## Direct Calls
- `SECSYS` - Security validation
- `DBREAD` - Database read utility
- `DBUPDAT` - Database update utility
- `AUDITLOG` - Audit logging system

## Known Data Conflicts
None detected

## Related Files
- CUSTDB (SQL copybook)
- SCR100M (Map definition)
- CustomerDataAccess.vb (Related VB.NET implementation)

## Recent Changes
- Fixed security validation issue (John Smith)
- Updated error handling for database timeouts (Jane Doe)
- Added audit logging for compliance (Bob Johnson)

## Related Jira Issues
- [PROJ-123](https://jira.com/PROJ-123): Customer screen performance issues (Done)
- [PROJ-456](https://jira.com/PROJ-456): Add audit trail logging (In Progress)

---
*Generated by CodeContext Live*
```

## Use Cases

### 1. Onboarding New Developers
New developers can instantly understand:
- What a module does
- Who to ask about it (last modifier)
- What it depends on
- Recent changes and why they were made

### 2. Code Reviews
During code reviews, get automatic context about:
- Historical changes
- Related Jira tickets
- Dependent modules
- Known issues

### 3. Impact Analysis
Before making changes:
- See what other programs call this code
- Identify potential conflicts
- Review recent changes
- Check related tickets

### 4. Legacy Code Migration
When migrating COBOL to C#:
- Understand COBOL program structure
- Identify all called programs
- Track related VB.NET implementations
- Maintain context across languages

## Development

### Project Structure

```
codecontext/
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Core services
│   │   ├── ai-agent.ts        # Claude AI integration
│   │   ├── code-parser.ts     # Code parsing (COBOL/VB/C#)
│   │   ├── context-gatherer.ts # Orchestration
│   │   ├── file-watcher.ts    # File monitoring
│   │   ├── jira-service.ts    # Jira integration
│   │   ├── monday-service.ts  # Monday.com integration
│   │   ├── svn-service.ts     # SVN integration
│   │   └── vector-store.ts    # Semantic search
│   ├── types/            # TypeScript type definitions
│   ├── server.ts         # REST API server
│   └── index.ts          # Main entry point
├── examples/
│   ├── cursor-extension/ # Cursor/VSCode integration
│   └── sample-files/     # Sample COBOL/VB/C# files
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode for development
npm start            # Start the server
```

### Testing

```bash
# Test with sample file
curl -X POST http://localhost:3000/api/context/markdown \
  -H "Content-Type: application/json" \
  -d '{"filePath": "./examples/sample-files/SCR100.cbl"}'
```

## Troubleshooting

### SVN Connection Issues
- Verify SVN command-line tools are installed: `svn --version`
- Check SVN credentials in `.env`
- Test SVN access: `svn info <your-repo-path>`

### Ollama Issues
- Ensure Ollama is running: `ollama serve`
- Verify model is downloaded: `ollama list`
- Check connection: `curl http://localhost:11434/api/tags`

### Claude API Issues
- Verify API key is valid
- Check API quota: https://console.anthropic.com
- Review error logs in console

### File Watching Not Working
- Check directory paths in `.env`
- Verify file extensions in `WATCH_EXTENSIONS`
- Ensure directories are accessible

## Roadmap

- [ ] Support for additional languages (Java, Python, etc.)
- [ ] Git integration (in addition to SVN)
- [ ] Custom code analysis rules
- [ ] Historical trend analysis
- [ ] Team collaboration features
- [ ] Browser-based UI
- [ ] VS Code extension package
- [ ] Integration with GitHub Copilot

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: support@example.com

---

**Built with:**
- [Claude AI](https://www.anthropic.com/claude) - AI-powered analysis
- [Ollama](https://ollama.ai/) - Local embeddings
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [Express](https://expressjs.com/) - REST API server
- [Chokidar](https://github.com/paulmillr/chokidar) - File watching
