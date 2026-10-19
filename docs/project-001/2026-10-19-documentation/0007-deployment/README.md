> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

# Clinic launch operations

Reviewed 19 October 2026. Current source/presentation is identified by [project status](../PROJECT-STATUS.md). The guided-launch guide owns the remaining provider work and labels its 15 October observations; an older deployment ID is not today’s application version. No provider/secret operation occurs in this documentation review.

Current progress and owner actions are controlled by [the guided launch](../0001-planning/plans/2026-10-15-guided-launch/README.md). This directory is operator-only material, outside the maintained website Git root. Never include it in a website export.

`profile-before-production.json` preserves the launch copy's prior public profile. The original imported website and frozen review candidates remain elsewhere and must not be deleted during setup.

`private-launch-store.py` stores only Windows DPAPI CurrentUser-encrypted setup material in `.private-launch/`. The encrypted file is ignored. The helper's public identity constants bind it to this clinic, installation, production environment and Neon project. Private values enter PowerShell through a process pipe, never command arguments; failures withhold raw output. Writes verify encryption before replacement and private readback afterward. Generated database passwords were saved and verified before creating the corresponding logins. Retry uses those same saved passwords and never silently resets an existing role.

Import `load()` only into an authorized private operating process. Do not print its returned object, export it into a file, place it in a tool argument, or put the migration/backup/maintenance connections in normal website settings. `write_clipboard()` supports the owner-authorized private dashboard handoff and verifies exact readback. Never copy private values into chat or screenshots.

This storage depends on the current Windows account. It helps resume setup after an interruption; it is not an independent recovery backup. Complete the contained encrypted backup/recovery requirements separately before activating bookings.

Focused synthetic helper checks live in `../0006-qa/2026-10-15-launch-private-store/`. They use an explicit test-only crypto stand-in and temporary synthetic files. Actual Windows encryption/decryption was separately verified on this computer before real setup material was saved. Provider database verification and protected dashboard saves remain separate evidence.
