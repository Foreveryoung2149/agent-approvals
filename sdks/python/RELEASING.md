# Releasing `nodsend-ai`

The package is published from GitHub Actions with PyPI Trusted Publishing. Do
not upload releases from a developer laptop or store a PyPI API token in GitHub.

## One-time PyPI configuration

In the `nodsend-ai` project settings on PyPI, add a trusted publisher with:

- Owner: `Foreveryoung2149`
- Repository: `Nodsend`
- Workflow: `publish-python-sdk.yml`
- Environment: `pypi`

Create a protected GitHub environment named `pypi`. Requiring a reviewer for
that environment provides a final human checkpoint before publishing.

## Release checklist

1. Update `src/nodsend/_version.py` and move the matching changelog section
   from `Unreleased` to the release date. A version can never be reused on PyPI.
2. From the repository root, verify the package:

   ```bash
   python -m pip install --upgrade build twine
   python -m pip install -e "sdks/python[dev]"
   python -m pytest sdks/python/tests
   python -m build --sdist --wheel --outdir dist sdks/python
   python -m twine check dist/*
   ```

3. Merge the release changes to `main`.
4. Create and publish a GitHub release from `main` with a tag exactly matching
   the package version, for example `v0.1.1`.
5. Approve the protected `pypi` environment deployment. The workflow builds the
   artifacts again, validates the tag/version match, and publishes via OIDC.
   If a GitHub release event is ever missed, rerun `Publish Python SDK` manually
   with the existing release tag; do not create a second tag for the same version.
6. Verify the release from a clean environment:

   ```bash
   python -m venv .release-check
   .release-check/bin/python -m pip install "nodsend-ai==0.1.1"
   .release-check/bin/python -c "import nodsend; print(nodsend.__version__)"
   ```

   On Windows, use `.release-check\\Scripts\\python.exe` instead.

If any validation step fails, fix it and publish a new tag/version. Never delete
or replace an artifact that users may already have installed.
