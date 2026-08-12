# LangChain external listing draft

Status: template only. Not submitted or approved. Fill every placeholder and
complete the release gates in `../DISTRIBUTION.md` first.

Target repository: `langchain-ai/docs`

Target file: `scripts/data/integration_external_docs.yaml`

Proposed row under `python.middleware`:

```yaml
- name: NodsendApprovalMiddleware
  pypi: langchain-nodsend
  docs_url: https://REPLACE_WITH_PUBLIC_INTEGRATION_DOCS
  available: >-
    Human approval middleware for exact tool calls with durable decisions,
    bounded redacted context, and replay-safe resume.
  source: "[`Foreveryoung2149/Nodsend`](https://github.com/Foreveryoung2149/Nodsend)"
```

Verify the current file shape immediately before editing. If the final class,
package, docs, or repository name differs, use the published truth.

## Pull request

Title:

```text
docs(integrations): list Nodsend approval middleware
```

Body:

```markdown
## Summary

Adds the published `langchain-nodsend` middleware to the external integration
download data. This is a listing-metadata-only change; the package and its docs
remain maintained by Nodsend.

## Verification

- PyPI: https://pypi.org/project/langchain-nodsend/REPLACE_VERSION/
- Docs: https://REPLACE_WITH_PUBLIC_INTEGRATION_DOCS
- Source: https://github.com/Foreveryoung2149/Nodsend/tree/REPLACE_TAG/REPLACE_PATH
- Compatibility CI: REPLACE_URL
- Runnable example: REPLACE_URL

## Disclosure

I maintain Nodsend. REPLACE_WITH_ACCURATE_LLM_DISCLOSURE_IF_APPLICABLE.
```

Pre-submit:

- [ ] Package/version URLs resolve without authentication.
- [ ] The example runs from a clean environment.
- [ ] YAML is placed in the current middleware list and passes docs CI.
- [ ] Only the one metadata row is changed.
- [ ] Wording does not claim endorsement or featured status.
