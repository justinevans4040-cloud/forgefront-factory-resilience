# ROLLBACK — Factory Resilience + Command Center V3 experiment

If you do not like the Program tab integration:

1. Stop any server started from the worktree (port will be documented in BUILD_INFO).
2. Do **not** delete `izzy-factory-resilience-build-final-r17\`.
3. Do **not** delete `PRESERVE__R17_SEALED__20261020\`.
4. Delete or rename the worktree folder only:
   `<LOCAL_PATH_REDACTED>`
5. To restore a clean R17 tree from sealed zip:
   Expand `<LOCAL_PATH_REDACTED>` into a fresh folder.
6. Verify SHA256 of sealed zips still match PRESERVE_MANIFEST.md.

The sealed R17 zips are the product freeze. The worktree is disposable until Justin accepts.
