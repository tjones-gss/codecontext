# CodeContext Live - Setup Guide

This guide walks you through setting up CodeContext Live in your environment.

## Prerequisites Installation

### 1. Node.js and npm

**Windows:**
1. Download Node.js from https://nodejs.org (LTS version recommended)
2. Run the installer
3. Verify installation:
```bash
node --version
npm --version
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. SVN Command-Line Tools

**Windows:**
1. Download TortoiseSVN from https://tortoisesvn.net
2. During installation, select "command line client tools"
3. Verify: `svn --version`

**Linux:**
```bash
sudo apt-get install subversion
```

### 3. Ollama (Local Embeddings)

**Windows:**
1. Download from https://ollama.ai/download
2. Run the installer
3. Start Ollama from Start Menu

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve &
```

**Pull the model:**
```bash
ollama pull llama2
```

### 4. Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (you'll need it for `.env`)

## CodeContext Live Setup

### Step 1: Install Dependencies

```bash
cd /path/to/codecontext
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# REQUIRED: Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# REQUIRED: Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# REQUIRED: SVN Configuration
SVN_REPO_PATH=\\\\LocalCobolSearch\\trunk\\cobol\\fujsource
SVN_USERNAME=your_username
SVN_PASSWORD=your_password

# REQUIRED: Source Directory
COBOL_SOURCE_DIR=\\\\LocalCobolSearch\\trunk\\cobol\\fujsource

# OPTIONAL: Jira (leave blank if not using)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

# OPTIONAL: Monday.com (leave blank if not using)
MONDAY_API_TOKEN=

# Server Configuration (defaults are fine)
PORT=3000
HOST=localhost
```

### Step 3: Configure SVN Access

#### For Network Paths (Windows)
If using UNC paths like `\\LocalCobolSearch\...`:

1. Map network drive (optional but recommended):
```cmd
net use Z: \\LocalCobolSearch\trunk /persistent:yes
```

2. Update `.env`:
```env
SVN_REPO_PATH=Z:\cobol\fujsource
COBOL_SOURCE_DIR=Z:\cobol\fujsource
```

#### For SVN URLs
If using `svn://` or `https://` URLs:

```env
SVN_REPO_PATH=svn://your-server/trunk/cobol/fujsource
```

### Step 4: Test SVN Connection

```bash
svn info "\\\\LocalCobolSearch\\trunk\\cobol\\fujsource"
```

Should show repository information. If you get an error:
- Check network connectivity
- Verify credentials
- Ensure SVN tools are in PATH

### Step 5: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 6: Initial Codebase Indexing (Optional)

To enable vector search, index your codebase:

```bash
npm start
```

Then in another terminal:

```bash
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"directories": ["\\\\LocalCobolSearch\\\\trunk\\\\cobol\\\\fujsource"]}'
```

This runs in the background and may take a while for large codebases.

## Testing the Installation

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-10-22T..."
}
```

### Test 2: Analyze Sample File

```bash
curl -X POST http://localhost:3000/api/context/markdown \
  -H "Content-Type: application/json" \
  -d '{"filePath": "./examples/sample-files/SCR100.cbl"}'
```

Should return a Markdown summary of the file.

### Test 3: Configuration Check

```bash
curl http://localhost:3000/api/config
```

Verify settings are correct.

## Integrating with Cursor

### Option 1: Use the REST API

Add this to your Cursor workspace settings:

```json
{
  "codecontext.apiUrl": "http://localhost:3000",
  "codecontext.enabled": true
}
```

### Option 2: Install the Example Extension

1. Copy `examples/cursor-extension/extension.js` to your Cursor extensions folder
2. Modify as needed for your environment
3. Reload Cursor

See `examples/cursor-extension/README.md` for detailed instructions.

## Configuring File Watching

To watch specific directories:

1. Edit `.env`:
```env
COBOL_SOURCE_DIR=C:\Projects\Cobol
ADDITIONAL_SOURCE_DIRS=C:\Projects\VBNet,C:\Projects\CSharp
WATCH_EXTENSIONS=.cbl,.cob,.vb,.cs
```

2. Restart CodeContext Live:
```bash
npm start
```

The watcher will now monitor all specified directories for file changes.

## Optional: Jira Integration

### Step 1: Get Jira API Token

1. Log in to Jira
2. Go to https://id.atlassian.com/manage/api-tokens
3. Create API token
4. Copy the token

### Step 2: Configure Jira

Update `.env`:
```env
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_token_here
```

### Step 3: Test Jira Connection

```bash
curl -u your.email@company.com:your_token \
  https://your-company.atlassian.net/rest/api/3/myself
```

Should return your Jira user information.

## Optional: Monday.com Integration

### Step 1: Get Monday API Token

1. Log in to Monday.com
2. Go to Profile → Admin → API
3. Generate a new API token
4. Copy the token

### Step 2: Configure Monday

Update `.env`:
```env
MONDAY_API_TOKEN=your_token_here
MONDAY_API_URL=https://api.monday.com/v2
```

### Step 3: Test Monday Connection

```bash
curl -X POST https://api.monday.com/v2 \
  -H "Authorization: your_token" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id name } }"}'
```

## Running as a Service

### Windows Service

Use [NSSM](https://nssm.cc/):

```cmd
nssm install CodeContextLive "C:\Program Files\nodejs\node.exe"
nssm set CodeContextLive AppDirectory "C:\path\to\codecontext"
nssm set CodeContextLive AppParameters "dist\index.js"
nssm start CodeContextLive
```

### Linux Systemd Service

Create `/etc/systemd/system/codecontext.service`:

```ini
[Unit]
Description=CodeContext Live
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/user/codecontext
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable codecontext
sudo systemctl start codecontext
sudo systemctl status codecontext
```

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

### SVN Authentication Fails

Try interactive login first:
```bash
svn list --username your_user \\\\LocalCobolSearch\\trunk\\cobol\\fujsource
```

Enter password when prompted. This caches credentials.

### Port Already in Use

Change port in `.env`:
```env
PORT=3001
```

### File Watching Not Working

Check permissions:
```bash
ls -la \\\\LocalCobolSearch\\trunk\\cobol\\fujsource
```

Ensure read access to the directories.

### Claude API Rate Limits

If hitting rate limits:
1. Check usage at https://console.anthropic.com
2. Consider caching results
3. Reduce analysis frequency

## Performance Tuning

### Vector Store Performance

For large codebases:
```env
VECTOR_STORE_PATH=./data/vector_store
# Use SSD for better performance
```

### Reduce Memory Usage

Limit concurrent file processing by adjusting `chokidar` options in `src/services/file-watcher.ts`:

```typescript
this.watcher = chokidar.watch(patterns, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100,
  },
  depth: 5, // Limit subdirectory depth
});
```

## Next Steps

1. Review [README.md](README.md) for API documentation
2. Check [examples/](examples/) for integration examples
3. Explore the sample files in [examples/sample-files/](examples/sample-files/)
4. Customize code parsers for your specific needs
5. Add custom analysis rules

## Getting Help

- Check logs: `tail -f codecontext.log`
- Enable debug mode: `NODE_ENV=development npm start`
- Open an issue on GitHub
- Contact support

---

You're now ready to use CodeContext Live!
