# CodeContext Live - Architecture

This document describes the architecture and design decisions of CodeContext Live.

## System Overview

CodeContext Live is a microservices-based system that provides real-time contextual intelligence for code files. It consists of several loosely-coupled services that work together to analyze, index, and surface information about code.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Systems                          │
├─────────────────────────────────────────────────────────────────┤
│  SVN Repo  │  Jira  │  Monday.com  │  Ollama  │  Claude API    │
└────┬────────────┬─────────┬────────────┬──────────────┬─────────┘
     │            │         │            │              │
     └────────────┴─────────┴────────────┴──────────────┘
                            │
     ┌──────────────────────┴──────────────────────┐
     │        CodeContext Live Backend              │
     ├──────────────────────────────────────────────┤
     │                                              │
     │  ┌────────────────────────────────────┐     │
     │  │     REST API Layer (Express)       │     │
     │  └─────────────┬──────────────────────┘     │
     │                │                             │
     │  ┌─────────────▼──────────────────────┐     │
     │  │     Context Gatherer Service       │     │
     │  │   (Orchestration & Coordination)   │     │
     │  └─────────────┬──────────────────────┘     │
     │                │                             │
     │       ┌────────┴─────────┐                  │
     │       │                  │                  │
     │  ┌────▼─────┐      ┌────▼─────┐            │
     │  │  File    │      │   AI     │            │
     │  │  Watcher │      │  Agent   │            │
     │  └────┬─────┘      └────┬─────┘            │
     │       │                 │                   │
     │  ┌────▼─────────────────▼─────┐            │
     │  │    Service Layer            │            │
     │  ├─────────────────────────────┤            │
     │  │ • SVN Service               │            │
     │  │ • Code Parser               │            │
     │  │ • Jira Service              │            │
     │  │ • Monday Service            │            │
     │  │ • Vector Store              │            │
     │  └─────────────────────────────┘            │
     │                                              │
     └──────────────────────────────────────────────┘
                         │
     ┌───────────────────┴───────────────────┐
     │           Clients                     │
     ├───────────────────────────────────────┤
     │  Cursor  │  VSCode  │  Custom Tools   │
     └───────────────────────────────────────┘
```

## Core Components

### 1. REST API Server (`src/server.ts`)

**Responsibility:** HTTP interface for external clients

**Key Features:**
- Express-based REST API
- CORS support for browser clients
- Request validation
- Error handling

**Endpoints:**
- `POST /api/context` - Get structured context
- `POST /api/context/markdown` - Get Markdown summary
- `POST /api/analyze` - Manual analysis trigger
- `POST /api/search` - Vector similarity search
- `POST /api/index` - Index codebase
- `GET /api/config` - Get configuration
- `GET /health` - Health check

**Design Decisions:**
- RESTful design for easy integration
- Stateless API (no session management)
- JSON for all data exchange
- Async/await for all operations

### 2. Context Gatherer (`src/services/context-gatherer.ts`)

**Responsibility:** Orchestrate context gathering from all sources

**Workflow:**
```
1. Read file content (local or SVN)
2. Determine file type (COBOL, VB.NET, C#)
3. Parse code structure
4. Get SVN history and metadata
5. Find related files (vector similarity + SVN)
6. Extract direct calls and dependencies
7. Search for Jira issues
8. Search for Monday.com items
9. Pass everything to AI Agent
10. Generate final digest
```

**Design Decisions:**
- Single point of orchestration
- Parallel data gathering where possible
- Graceful degradation (continue even if some services fail)
- Caching of intermediate results (future enhancement)

### 3. File Watcher (`src/services/file-watcher.ts`)

**Responsibility:** Monitor file system for changes

**Technology:** Chokidar (cross-platform file watching)

**Features:**
- Watch multiple directories
- Filter by file extensions
- Debounce rapid changes
- Event-driven callbacks

**Events Monitored:**
- `add` - New file created
- `change` - File modified

**Design Decisions:**
- Non-blocking I/O
- Configurable debounce to avoid spam
- Callback pattern for extensibility
- Manual trigger option for on-demand analysis

### 4. SVN Service (`src/services/svn-service.ts`)

**Responsibility:** Interact with Subversion repositories

**Features:**
- Get commit history (`svn log`)
- Get file content (`svn cat`)
- Get blame information (`svn blame`)
- Search for related files

**Implementation:**
- Uses command-line SVN tools
- XML parsing for log output
- Credential management
- Error handling for network issues

**Design Decisions:**
- Command-line interface (not library) for maximum compatibility
- Async operations with promisified exec
- Simple XML parsing (could be enhanced with xml2js)
- Caching of SVN operations (future enhancement)

### 5. Code Parser (`src/services/code-parser.ts`)

**Responsibility:** Parse COBOL, VB.NET, and C# code

**Features:**
- Identify functions/methods/paragraphs
- Extract CALL/PERFORM statements
- Find data structures
- Extract comments
- Identify dependencies (COPY, Imports, using)

**Language-Specific Parsing:**

**COBOL:**
- Sections and paragraphs
- CALL and PERFORM statements
- COPY statements
- 01-level data structures
- Comment lines (asterisk in column 7)

**VB.NET:**
- Functions and Subs
- Imports statements
- Classes and Structures
- Single-line comments (')

**C#:**
- Methods
- Using statements
- Classes, interfaces, structs
- Single-line comments (//)

**Design Decisions:**
- Regex-based parsing (not AST)
- Fast and lightweight
- Good enough for context gathering
- Could be enhanced with proper parsers (future)

### 6. AI Agent (`src/services/ai-agent.ts`)

**Responsibility:** Analyze context and generate summaries using Claude

**Technology:** Anthropic Claude API (Sonnet 3.5)

**Process:**
```
1. Build comprehensive prompt with:
   - File metadata
   - SVN history
   - Parsed code structure
   - Related files
   - Comments
   - Code preview
2. Send to Claude with system prompt
3. Parse structured response
4. Generate Markdown summary
```

**Prompt Engineering:**
- Clear role definition ("CodeContext Live agent")
- Structured information presentation
- Specific output format requirements
- Context window optimization

**Design Decisions:**
- Claude Sonnet for balance of speed/quality
- Structured prompts for consistent output
- Markdown format for universal compatibility
- Fallback digest if API fails

### 7. Vector Store (`src/services/vector-store.ts`)

**Responsibility:** Semantic search across codebase

**Technology:** Ollama embeddings (local)

**Features:**
- Generate embeddings for files
- Cosine similarity search
- Persist to disk (JSON)
- Index entire codebases

**Workflow:**
```
1. Read file content
2. Generate embedding via Ollama
3. Store document with metadata
4. For searches:
   a. Generate query embedding
   b. Compute cosine similarity with all docs
   c. Return top K results
```

**Design Decisions:**
- Local embeddings (Ollama) for privacy and speed
- Simple JSON persistence (could move to proper DB)
- In-memory index for fast searches
- Lazy loading on startup

### 8. Integration Services

#### Jira Service (`src/services/jira-service.ts`)
- REST API integration
- JQL queries for file search
- Extract Jira keys from text
- Issue metadata retrieval

#### Monday.com Service (`src/services/monday-service.ts`)
- GraphQL API integration
- Item search by file name
- Query-based search

**Design Decisions:**
- Optional integrations (graceful degradation)
- Separate services for clean architecture
- Credential management via environment
- Error handling without breaking main flow

## Data Flow

### File Open Event Flow

```
1. User opens file in editor
   │
   ├─▶ Editor sends request to CodeContext Live API
   │
2. API receives request
   │
   ├─▶ Validates request
   ├─▶ Calls Context Gatherer
   │
3. Context Gatherer orchestrates data collection
   │
   ├─▶ File Reader: Read file content
   ├─▶ Code Parser: Parse structure
   ├─▶ SVN Service: Get history
   ├─▶ Vector Store: Find related files
   ├─▶ Jira Service: Find issues
   └─▶ Monday Service: Find items
   │
4. All data collected
   │
   ├─▶ AI Agent: Analyze and summarize
   │
5. Generate Markdown summary
   │
   └─▶ Return to API
   │
6. API returns response to editor
   │
   └─▶ Editor displays context panel
```

### Indexing Flow

```
1. Index request received
   │
   ├─▶ Vector Store starts background indexing
   │
2. For each directory:
   │
   ├─▶ Recursively walk file tree
   ├─▶ Filter by extensions
   │
3. For each file:
   │
   ├─▶ Read content
   ├─▶ Generate embedding (Ollama)
   ├─▶ Store document + metadata
   │
4. Persist index to disk
   │
   └─▶ Ready for searches
```

## Design Patterns

### 1. Service Layer Pattern
- Each service is self-contained
- Services export singleton instances
- Clear separation of concerns

### 2. Orchestrator Pattern
- Context Gatherer orchestrates multiple services
- Parallel operations where possible
- Error isolation

### 3. Observer Pattern
- File Watcher emits events
- Callbacks for extensibility
- Decoupled components

### 4. Repository Pattern
- Vector Store abstracts data access
- Consistent interface for storage
- Easy to swap implementations

## Configuration Management

Configuration is centralized in `src/config/index.ts`:
- Environment variable parsing
- Type-safe configuration object
- Validation at startup
- Default values

## Error Handling Strategy

1. **API Layer:** HTTP status codes + JSON error messages
2. **Service Layer:** Try/catch with logging, graceful degradation
3. **External APIs:** Retry logic, timeouts, fallbacks
4. **File Operations:** Check existence, handle permissions

## Performance Considerations

### Current Optimizations:
- Async/await throughout
- Parallel data gathering
- In-memory vector store
- File watching with debounce

### Future Optimizations:
- Redis cache for SVN operations
- PostgreSQL for vector store (pgvector)
- Result caching (TTL-based)
- Streaming responses for large files
- Rate limiting for AI API

## Security Considerations

### Current:
- Environment-based credentials
- No credential exposure in API
- Input validation
- CORS configuration

### Future Enhancements:
- API key authentication
- Rate limiting
- Audit logging
- Credential encryption
- Role-based access control

## Scalability

### Current Limitations:
- Single instance (no clustering)
- In-memory vector store
- No load balancing

### Future Scaling:
- Horizontal scaling with load balancer
- Distributed vector store
- Message queue for indexing
- Microservices decomposition

## Testing Strategy

### Unit Tests (Future):
- Service layer tests
- Code parser tests
- Utility function tests

### Integration Tests (Future):
- API endpoint tests
- SVN integration tests
- Database tests

### End-to-End Tests (Future):
- Full workflow tests
- Editor integration tests

## Deployment Architecture

### Development:
```
Local Machine
├── CodeContext Live (Node.js)
├── Ollama (local)
└── SVN access (network)
```

### Production:
```
Application Server
├── CodeContext Live (PM2/systemd)
├── Ollama (local or remote)
├── SVN access (network)
└── Reverse proxy (nginx)
```

## Technology Choices

### TypeScript
- Type safety
- Better IDE support
- Easier refactoring

### Express
- Simple and mature
- Large ecosystem
- Good performance

### Chokidar
- Cross-platform file watching
- Reliable
- Well-maintained

### Ollama
- Local embeddings (privacy)
- Fast
- Free
- Multiple models

### Claude API
- Best-in-class analysis
- Good reasoning
- Structured output

## Future Architecture Enhancements

1. **Caching Layer:** Redis for SVN and API caching
2. **Message Queue:** RabbitMQ/SQS for async indexing
3. **Database:** PostgreSQL with pgvector for scalable vector store
4. **Event Streaming:** Kafka for real-time events
5. **API Gateway:** Kong/AWS API Gateway for rate limiting and auth
6. **Monitoring:** Prometheus + Grafana for metrics
7. **Logging:** ELK stack for centralized logging
8. **Container Orchestration:** Kubernetes for scaling

## Maintenance and Operations

### Monitoring Points:
- API response times
- Vector store size
- Ollama health
- SVN availability
- AI API usage

### Logs:
- Application logs (Winston)
- Access logs
- Error logs
- Audit logs

### Backups:
- Vector store index
- Configuration files

---

This architecture is designed for:
- ✅ Rapid development
- ✅ Easy integration
- ✅ Reliability
- ✅ Extensibility
- ⏳ Future scalability (with enhancements)
