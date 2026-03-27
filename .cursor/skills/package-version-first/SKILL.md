---
name: package-version-first
description: Always bump extension version in package.json before packaging VSIX. Use when user asks to package, build release artifacts, generate VSIX, publish, or prepare an installable extension package.
---

# Package Version First

## Rule

For this project, every packaging workflow must bump `package.json` version first, then run `npm run package`.

Never package first and bump later.

## Trigger Scenarios

Apply this skill when user asks to:

- package extension
- build a VSIX
- generate an installable package
- prepare release artifact
- publish extension build

## Required Workflow

1. Read current `package.json` version.
2. Decide target version:
   - If user provided exact version, use it.
   - If user did not provide version, default to patch +1 (e.g. `2.0.1-4` -> `2.0.1-5`) and execute directly.
3. Update `package.json` `version` field.
4. Run `npm run package`.
5. Report final VSIX path and version.

## Output Format

When done, always include:

- New version number
- Absolute VSIX path
- Packaging result (success/failure)

