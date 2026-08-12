# Nodsend SDKs

The first public SDK is the typed Python package in `python/`. It includes
optional adapters for LangChain, CrewAI, and AutoGen without making any of those
frameworks a core dependency. A dependency-light, native-fetch TypeScript
client now lives in `typescript/`; it is early access and is not published yet.

The server contract is defined in `../openapi/nodsend.openapi.yaml`. SDK code,
documentation, and server behavior must remain contract-tested against that
document before each package release.

Current integration validation includes Python framework compatibility CI and
isolated TypeScript SDK/OpenClaw tests. Still planned after the API contract
stabilizes:

- publish `@nodsend/sdk` with provenance after its full API surface is complete;
- generated API fixtures for other languages from the same OpenAPI document;
- minimum/latest version matrices for every public framework package.

The Python package is published to PyPI as `nodsend-ai` and remains early access.
No SDK in this directory should be described as stable until its end-to-end
production API checks, compatibility matrix, and versioning policy are complete.
