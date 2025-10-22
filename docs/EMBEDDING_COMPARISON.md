# Embedding Provider Comparison

This document helps you choose the right embedding provider for your setup.

## Quick Decision Tree

```
Do you have a powerful machine (8+ GB RAM, modern CPU)?
├─ YES → Consider Ollama (local, free, private)
└─ NO
    ├─ Have budget for cloud services?
    │   ├─ YES → Use OpenAI ($0.02 per 1K files)
    │   └─ NO → Use Cohere (FREE tier) or None (FREE)
    └─ Need maximum privacy?
        └─ Use None (keyword search, no data sent anywhere)
```

## Detailed Comparison

### Option 1: None (Keyword Search)

**Best For:**
- Users without powerful machines
- Maximum privacy requirements
- Zero budget
- Quick testing/evaluation
- Small codebases with good naming

**Pros:**
- ✅ Works on ANY machine
- ✅ Completely FREE
- ✅ No external dependencies
- ✅ Maximum privacy (all local)
- ✅ Instant startup
- ✅ No internet required

**Cons:**
- ❌ Search quality lower than embeddings
- ❌ No semantic understanding
- ❌ Relies on keyword matching

**Cost:** FREE

**Machine Requirements:** Any (even Raspberry Pi)

**Setup Time:** 1 minute

---

### Option 2: OpenAI

**Best For:**
- Professional/commercial use
- Users wanting best quality
- Teams with budget
- Laptops/low-powered machines

**Pros:**
- ✅ Works on ANY machine
- ✅ High-quality embeddings
- ✅ Fast and reliable
- ✅ No local compute needed
- ✅ Simple setup

**Cons:**
- ❌ Costs money (cheap, but not free)
- ❌ Data sent to OpenAI
- ❌ Requires internet

**Cost:**
- $0.02 per 1 million tokens
- ~$0.02 to index 1,000 files
- ~$0.20 to index 10,000 files

**Machine Requirements:** Any

**Setup Time:** 5 minutes

---

### Option 3: Cohere

**Best For:**
- Users wanting FREE embeddings
- Testing/evaluation
- Small to medium codebases
- Low-powered machines

**Pros:**
- ✅ Works on ANY machine
- ✅ FREE tier (1,000 calls/month)
- ✅ Good quality embeddings
- ✅ No local compute needed
- ✅ Simple setup

**Cons:**
- ❌ Limited free tier
- ❌ Data sent to Cohere
- ❌ Requires internet

**Cost:**
- FREE: 1,000 API calls/month
- Paid: $0.10 per 1M tokens

**Machine Requirements:** Any

**Setup Time:** 5 minutes

---

### Option 4: Ollama (Local)

**Best For:**
- Privacy-conscious organizations
- Users with powerful desktops
- Offline environments
- Maximum control

**Pros:**
- ✅ Completely FREE
- ✅ Maximum privacy (all local)
- ✅ No data sent anywhere
- ✅ Works offline
- ✅ No usage limits

**Cons:**
- ❌ Requires powerful machine
- ❌ Slow indexing
- ❌ High CPU/RAM usage
- ❌ Complex setup

**Cost:** FREE

**Machine Requirements:**
- CPU: 8+ cores recommended
- RAM: 8GB minimum, 16GB+ recommended
- Disk: 5-10GB for models
- GPU: Optional but much faster

**Setup Time:** 30 minutes

---

## Performance Comparison

### Indexing 1,000 COBOL Files

| Provider | Time | CPU | RAM | Network | Cost |
|----------|------|-----|-----|---------|------|
| **None** | 30s | 10% | 50MB | No | $0 |
| **OpenAI** | 2-3min | 5% | 50MB | Yes | $0.02 |
| **Cohere** | 2-3min | 5% | 50MB | Yes | FREE |
| **Ollama** | 15-30min | 90% | 4-8GB | No | $0 |

### Search Speed (typical query)

All providers: **< 100ms**

### Search Quality

1. **OpenAI / Ollama** (tie) - Excellent semantic understanding
2. **Cohere** - Very good semantic understanding
3. **None** - Good keyword matching

---

## Real-World Use Cases

### Scenario 1: Solo Developer on Laptop

**Recommended:** None or Cohere

**Reasoning:**
- Laptop doesn't have resources for Ollama
- Free options work great for personal use
- Can upgrade to OpenAI later if needed

**Config:**
```env
EMBEDDING_PROVIDER=none
# or
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=your-free-key
```

---

### Scenario 2: Small Team with Budget

**Recommended:** OpenAI

**Reasoning:**
- Best quality for professional work
- Cost is negligible ($0.20 for 10K files)
- No infrastructure to maintain
- Fast and reliable

**Config:**
```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Monthly Cost:** < $5 for typical usage

---

### Scenario 3: Large Enterprise (Privacy Requirements)

**Recommended:** Ollama on dedicated server

**Reasoning:**
- No data leaves the organization
- One-time setup on powerful server
- All developers connect to it
- Maximum control

**Setup:**
1. Provision beefy server (16GB+ RAM)
2. Install Ollama
3. All developers point to it:
   ```env
   EMBEDDING_PROVIDER=ollama
   OLLAMA_BASE_URL=http://ollama-server:11434
   ```

---

### Scenario 4: Government/Classified Environment

**Recommended:** None (keyword search)

**Reasoning:**
- Air-gapped network (no internet)
- Can't install Ollama (restricted software)
- Keyword search works fine offline
- Zero external dependencies

**Config:**
```env
EMBEDDING_PROVIDER=none
```

---

## Migration Path

You can start with one provider and switch later:

### Path 1: Start Free → Upgrade
```
None (FREE) → Cohere (FREE tier) → OpenAI (paid) → Ollama (if you get powerful machine)
```

### Path 2: Start Best → Downgrade
```
OpenAI (best quality) → Test with None → Decide if quality difference matters
```

### Switching Steps:
1. Update `EMBEDDING_PROVIDER` in `.env`
2. Restart CodeContext Live
3. Re-index codebase: `POST /api/index`

---

## Cost Calculator

### OpenAI Pricing

Files to index: **[N]**
Average lines per file: **[L]**

Tokens ≈ Lines × 1.5
Total tokens = N × L × 1.5
Cost = (Total tokens / 1,000,000) × $0.02

**Examples:**
- 100 files × 500 lines = $0.0015 ≈ FREE
- 1,000 files × 500 lines = $0.015 ≈ $0.02
- 10,000 files × 500 lines = $0.15 ≈ $0.20
- 100,000 files × 500 lines = $1.50

---

## Troubleshooting

### "Which provider should I choose?"

**Answer:** Start with `none`. If search results aren't good enough, try Cohere (free tier), then OpenAI if you need better quality.

### "Can I use different providers for different projects?"

**Answer:** Yes! Each CodeContext Live instance can use a different provider.

### "Can I run Ollama on a server and connect remotely?"

**Answer:** Yes! Perfect for teams:
1. Install Ollama on a powerful server
2. Set `OLLAMA_BASE_URL=http://server:11434`
3. Everyone shares the same embeddings

### "How often do I need to generate embeddings?"

**Answer:** Only when:
- Indexing new files
- Files are modified (automatic)
- Switching providers

Embeddings are cached, so you only pay once per file.

---

## Recommendations Summary

| Your Situation | Best Choice | Second Choice |
|---------------|-------------|---------------|
| Low-powered machine | None | Cohere |
| Professional team | OpenAI | Cohere |
| Privacy requirements | None | Ollama (on server) |
| Testing/evaluation | None | Cohere |
| Powerful desktop | Ollama | OpenAI |
| Air-gapped network | None | - |
| Budget = $0 | None | Cohere |
| Want best quality | OpenAI | Ollama |

---

**Still unsure? Start with `EMBEDDING_PROVIDER=none` and upgrade later if needed!**
