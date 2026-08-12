# Framework examples

These examples are small, executable bridges rather than complete production
applications. They use harmless simulated side effects and block while waiting
for the approval email so the complete pause/review/resume lifecycle is visible
from one process.

Set these variables before running an example:

```bash
export NODSEND_API_KEY="..."
export NODSEND_REVIEWER_EMAIL="reviewer@example.com"
```

On PowerShell, use `$env:NODSEND_API_KEY = "..."` and the equivalent reviewer
variable. Use Python 3.10-3.13 for CrewAI and AutoGen examples; their current
releases do not support Python 3.14. Install the relevant extra first:

```bash
python -m pip install "nodsend-ai[langchain]" langchain-openai
python -m pip install "nodsend-ai[crewai]"
python -m pip install "nodsend-ai[autogen]"
```

- `langgraph_approval.py` also needs the model provider credential selected by
  `NODSEND_EXAMPLE_MODEL` (default: `openai:gpt-4.1-mini`).
- `crewai_approval.py` exercises CrewAI's non-blocking feedback-provider
  contract without needing an LLM.
- `autogen_approval.py` executes the generated `FunctionTool` directly, so no
  model provider is required.

The examples use in-memory state or bounded polling to remain easy to run. A
production service must use durable framework state, receive signed Nodsend
webhooks, reject replayed event IDs atomically, and resume work from a worker.
See the package README for that production pattern.
