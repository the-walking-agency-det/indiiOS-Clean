🧪 [Testing Improvement] Add missing tests for AccessControlService

🎯 **What:**
The `AccessControlService` in `packages/main/src/security/AccessControlService.ts` lacked test coverage for specific error handling blocks (lines 28 and 83), specifically when `path.resolve` fails during `grantAccess` and when `fs.realpathSync` fails while mapping system allowlist roots in `verifyAccess`.

📊 **Coverage:**
The added tests cover:
- Catch block in `grantAccess` where an error is logged when the path resolution fails.
- Fallback logic in `verifyAccess` where `path.resolve` is used if `fs.realpathSync` throws an error for system allowlist roots (like `userData`).

✨ **Result:**
The test coverage for `AccessControlService.ts` is now at 100% (Lines, Statements, and Functions). This ensures the application behaves predictably when dealing with irregular or non-existent file paths and system roots, increasing overall application reliability.
