# opencode-open-in-app

An OpenCode TUI plugin for opening the current project in a desktop app.

<img width="426" height="116" alt="CleanShot 2026-08-01 at 13 11 58@2x" src="https://github.com/user-attachments/assets/105a6ffc-172d-41eb-8766-bd275387be8a" />

<img width="1052" height="394" alt="CleanShot 2026-08-01 at 13 12 37@2x" src="https://github.com/user-attachments/assets/1004207f-c5b7-4bb3-968c-c0d6df7619f1" />



## Installation

Install the public package directly when it is available:

```sh
npm install opencode-open-in-app
```

OpenCode can also install npm plugins automatically. Add the package to the
global or project `opencode.json` configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-open-in-app"]
}
```

Restart OpenCode after changing the configuration. The sidebar control opens
the current project in a detected VS Code, Cursor, or platform file explorer;
the selected favourite is persisted by OpenCode.

## Development

Requires Node.js 22.13 or newer and pnpm.

```sh
pnpm install
pnpm typecheck
pnpm build
```

## Release process

Releases use a staged bootstrap followed by semantic-release on `main`:

1. Repository preparation temporarily sets `package.json` to `0.1.0`. This is
   only the candidate for the first manual public publish; its presence does
   not authorize publication.
2. After all planned repository tasks are complete, `openspec-verifier` owns
   the final candidate validation. It runs typecheck, the complete test suite,
   build, package inspection, and the production dependency audit against the
   exact checkout that may be published.
3. The primary orchestrator presents that current evidence and obtains
   separate execution-time authorization for repository integration, manual
   npm publication, the `v0.1.0` tag, and its GitHub Release. A downstream
   action is never implied by authorization for an earlier action.
4. After the public baseline and matching tag exist, a non-releasing change
   restores `0.0.0-development`. This sentinel remains committed to `main`;
   semantic-release writes computed versions only into published artifacts,
   while npm versions and git tags remain the release sources of truth.
5. The complete release workflow initially remains dispatch-only. Once it is
   on canonical `main`, the maintainer configures the package-scoped npm
   Trusted Publisher for `Angel-M-R/opencode-open-in-app` and `release.yml`.
   The workflow uses OIDC without `NPM_TOKEN` or another long-lived npm
   credential.
6. Only after separate authorization may the dormant workflow run once as a
   no-release OIDC preflight. It must validate the checkout, prove npm
   authentication, report no relevant release, and create no package, tag, or
   GitHub Release. A reviewed, release-worthy documentation fix activates the
   `push`-to-`main` trigger only after that preflight succeeds.

Do not dispatch the dormant workflow before `0.1.0`, its baseline tag, the
canonical workflow, and the npm Trusted Publisher are all confirmed. Pushing,
opening or merging a pull request, publishing, tagging, creating a GitHub
Release, dispatching or activating a workflow, and inspecting or changing npm
or GitHub settings or secrets each require fresh authorization obtained by the
primary orchestrator. Planned tasks and verifier success are evidence, not
authorization.

### Conventional Commit effects

semantic-release derives versions and generated release notes from commits
since the previous release:

- `fix:` produces a patch release.
- `feat:` produces a minor release.
- A Conventional Commit breaking-change marker produces a major release.
- Commits without a release signal do not publish a version.

Automated releases publish to npm and create a matching `vX.Y.Z` tag and
GitHub Release. They do not commit a changelog or release version back to
`main`, and tags are outputs rather than workflow triggers.

### Verification and provenance

The final verifier and every release workflow run these gates before
publication:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm run pack:dry-run
pnpm run audit:prod
```

For a public release, confirm the npm version, the matching immutable git tag,
and the generated GitHub Release. For an automated release, follow the
provenance link on the npm package version and verify that its source repository,
workflow (`release.yml`), and commit match the successful GitHub Actions run.
Missing or mismatched provenance blocks release acceptance.

### Forward-only recovery

Never rewrite a published npm version or use `npm unpublish` as routine
recovery. Deprecate a defective version when appropriate, prepare and verify a
fix, and publish a later version through the normal authorization gates. If npm
publication succeeds but a tag or GitHub Release is missing, stop automatic
retries, inspect the existing state, and restore only the missing output after
explicit authorization; do not republish the same version.
