# OpenClaw ClawHub release record

Status: blocked template. Not published, reviewed, verified, or official.

Do not run a real publish until `../DISTRIBUTION.md`'s host-native safe-resume
and publication checklists are complete.

## Release identity

```text
ClawHub owner: REPLACE
Package: @REPLACE_OWNER/nodsend
Version: REPLACE
Source repository: https://github.com/Foreveryoung2149/Nodsend
Source commit: REPLACE_FULL_SHA
Supported OpenClaw range: REPLACE
Maintenance owner: REPLACE
Security contact: REPLACE
```

The package scope must match the selected ClawHub owner. The current
`@nodsend/openclaw` name is usable only if the authenticated publisher controls
the `nodsend` owner.

## Validation record

```text
Host-native resume contract/maintainer reference: REPLACE_URL
Gateway integration CI: REPLACE_URL
Approve/reject/timeout/restart/replay evidence: REPLACE_URL
Security review: REPLACE_URL
clawhub package validate output: REPLACE_URL_OR_ARTIFACT
clawhub package publish --dry-run output: REPLACE_URL_OR_ARTIFACT
Clean install transcript: REPLACE_URL_OR_ARTIFACT
```

## Dry-run commands

Use the exact final package path/source required by the current ClawHub CLI:

```bash
clawhub package validate REPLACE_SOURCE
clawhub package publish REPLACE_SOURCE --dry-run
```

Suggested categories, if the current package publisher accepts them:
`security`, `agents`, `integrations`. Do not use trust/endorsement words in
topics.

## Announcement gate

- [ ] ClawHub release is publicly discoverable after review.
- [ ] Clean install succeeds with the documented command.
- [ ] The installed artifact matches the recorded source commit.
- [ ] The approval resumes exactly once in the supported Gateway.
- [ ] Announcement says "community plugin" and does not say "official" or
      "verified" unless OpenClaw explicitly grants that status.
