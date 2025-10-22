# CodeContext Live - Lightweight Setup Guide

**For Users Without Powerful Machines**

If you don't have a powerful machine to run Ollama locally, CodeContext Live offers several lightweight alternatives for embeddings and semantic search.

## Option 1: No Embeddings (Keyword Search Only) - FREE

This is the simplest and most lightweight option. It works on ANY machine, requires NO additional services, and is completely FREE.

### How It Works

Instead of using AI embeddings for semantic search, CodeContext Live falls back to keyword-based search using Jaccard similarity. While not as sophisticated as embedding-based search, it still provides useful results.

### Setup

1. In your `.env` file, set:
```env
EMBEDDING_PROVIDER=none
```

2. That's it! No other configuration needed.

### What You Get

- ✅ Full SVN integration
- ✅ Full code parsing
- ✅ Full AI-powered context summaries (via Claude)
- ✅ Jira and Monday.com integration
- ✅ File monitoring
- ✅ Related file search (keyword-based)
- ❌ Semantic embeddings

### What You Lose

- Semantic similarity search is replaced with keyword matching
- Related files are found based on token overlap, not meaning

### Performance

- Instant startup (no embedding generation)
- No background services required
- Minimal CPU/RAM usage
- Perfect for low-powered machines

---

## Option 2: OpenAI Embeddings - CLOUD-BASED

Use OpenAI's embedding API for high-quality semantic search without running anything locally.

### Pros

- No local compute required
- High-quality embeddings
- Fast and reliable
- Works on any machine

### Cons

- Requires OpenAI API key
- Costs money (but very cheap)
- Requires internet connection

### Pricing

OpenAI's `text-embedding-3-small` model:
- **$0.02 per 1M tokens**
- A typical COBOL file (500 lines) ≈ 1,000 tokens
- Cost to index 1,000 files ≈ $0.02

### Setup

1. Get an OpenAI API key:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key

2. In your `.env` file:
```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

3. Start CodeContext Live:
```bash
npm start
```

### Recommended For

- Professional use with budget
- Teams wanting best quality without local infrastructure
- Users on laptops/low-powered machines

---

## Option 3: Cohere Embeddings - CLOUD-BASED

Similar to OpenAI but with a different provider. Cohere offers competitive pricing and quality.

### Pros

- No local compute required
- Good quality embeddings
- Generous free tier
- Works on any machine

### Cons

- Requires Cohere API key
- Requires internet connection

### Pricing

Cohere's `embed-english-light-v3.0` model:
- **FREE tier**: 1,000 calls/month
- **Paid**: $0.10 per 1M tokens

### Setup

1. Get a Cohere API key:
   - Go to https://dashboard.cohere.com/api-keys
   - Sign up (free tier available)
   - Create a new API key

2. In your `.env` file:
```env
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=your-key-here
COHERE_EMBEDDING_MODEL=embed-english-light-v3.0
```

3. Start CodeContext Live:
```bash
npm start
```

### Recommended For

- Users wanting free embeddings (within limits)
- Testing and evaluation
- Small to medium codebases

---

## Option 4: Ollama (Local) - REQUIRES POWERFUL MACHINE

This is the original option, requiring a powerful machine to run local embeddings.

### System Requirements

- CPU: Modern multi-core processor (8+ cores recommended)
- RAM: 8GB minimum, 16GB+ recommended
- Disk: 5-10GB for models
- GPU: Optional but significantly faster

### Setup

See main SETUP.md for full Ollama installation instructions.

### Recommended For

- Users with powerful desktop machines
- Privacy-conscious users (everything stays local)
- Offline environments
- Maximum control over embeddings

---

## Comparison Table

| Feature | None (Keyword) | OpenAI | Cohere | Ollama |
|---------|---------------|---------|---------|---------|
| **Cost** | FREE | ~$0.02/1K files | FREE tier available | FREE |
| **Machine Requirements** | Any | Any | Any | Powerful |
| **Internet Required** | No | Yes | Yes | No |
| **Search Quality** | Good | Excellent | Excellent | Excellent |
| **Setup Complexity** | Minimal | Easy | Easy | Moderate |
| **Privacy** | Best | Data sent to OpenAI | Data sent to Cohere | Best |
| **Startup Time** | Instant | Instant | Instant | Slow |

---

## Recommended Configurations

### For Lightweight Laptops/Desktops
```env
EMBEDDING_PROVIDER=none
# Or if you have budget:
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

### For Teams with Budget
```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### For Privacy-Conscious Organizations
```env
EMBEDDING_PROVIDER=none
# Or install on a powerful server:
# EMBEDDING_PROVIDER=ollama
```

### For Testing/Evaluation
```env
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=...
COHERE_EMBEDDING_MODEL=embed-english-light-v3.0
```

---

## Switching Providers

You can switch providers at any time by changing `EMBEDDING_PROVIDER` in your `.env` file.

**Note:** If you switch providers, you'll need to re-index your codebase:

```bash
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"directories": ["path/to/your/code"]}'
```

---

## Performance Comparison

### Indexing 1,000 Files

| Provider | Time | CPU Usage | RAM Usage | Cost |
|----------|------|-----------|-----------|------|
| None | 30s | Low | <100MB | $0 |
| OpenAI | 2-3min | Very Low | <100MB | ~$0.02 |
| Cohere | 2-3min | Very Low | <100MB | FREE |
| Ollama | 15-30min | High | 4-8GB | $0 |

### Search Performance

All providers return results in <100ms for typical queries.

---

## Troubleshooting

### "Error generating embedding with openai"

**Solution:**
1. Check your API key is correct
2. Verify you have credits in your OpenAI account
3. Check internet connection

### "Error generating embedding with cohere"

**Solution:**
1. Check your API key is correct
2. Verify you haven't exceeded free tier limits
3. Check internet connection

### "Keyword search returns poor results"

**Solution:**
- Keyword search is simpler than embeddings
- Try more specific queries
- Include exact function/variable names
- Consider upgrading to cloud embeddings ($0.02 for OpenAI)

---

## FAQ

### Q: Can I use embeddings just for some files?

**A:** No, it's all or nothing. But you can switch providers at any time.

### Q: How much does OpenAI embeddings cost for a large codebase?

**A:** For 10,000 files averaging 1,000 tokens each:
- Cost: ~$0.20 one-time indexing cost
- Additional cost for new files as you add them

### Q: Is keyword search really good enough?

**A:** For many use cases, yes! Especially if:
- You know what you're looking for (specific function names)
- Your code has good naming conventions
- You're searching within a specific domain

### Q: Can I run Ollama on a cloud server and connect remotely?

**A:** Yes! Just:
1. Install Ollama on a powerful cloud VM
2. Set `OLLAMA_BASE_URL=http://your-server:11434`
3. Set `EMBEDDING_PROVIDER=ollama`

### Q: What if I want maximum privacy?

**A:** Use `EMBEDDING_PROVIDER=none` or run Ollama locally. Both keep all data on your machine.

---

## Next Steps

1. Choose your embedding provider based on the comparison above
2. Update your `.env` file
3. Start CodeContext Live: `npm start`
4. (Optional) Index your codebase: `POST /api/index`
5. Start analyzing files!

---

## Need Help?

- For general setup issues, see SETUP.md
- For API issues, see README.md
- For architecture details, see ARCHITECTURE.md
- Open an issue on GitHub for bugs/questions
