# Nodsend SDKs

The first production SDK is the typed Python package in `python/`. It includes
optional adapters for LangChain, CrewAI, and AutoGen without making any of those
frameworks a core dependency.

The server contract is defined in `../openapi/nodsend.openapi.yaml`. SDK code,
documentation, and server behavior must remain contract-tested against that
document before a package is published.

Planned after the API contract stabilizes:

- `@nodsend/sdk`: dependency-light TypeScript client using native `fetch`.
- Generated API fixtures for other languages from the same OpenAPI document.
- Framework compatibility CI against supported minimum and latest versions.

No SDK in this directory should be described as generally available until its
package release and end-to-end production API checks are complete.
