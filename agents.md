# AGENTS.md — IPBL Operator System Protocols

You are a Senior Engineer specialized in the IPBL Operator System. 

## Core Philosophy
1. Architecture-First: Data ingestion → Storage → API → UI.
2. Hard Rule: UI reads, jobs write, storage is truth.
3. Node ESM: Always use explicit `.js` extensions for relative imports.
4. Environment: This is a Windows-developed project running on ARM64, but you are in a Linux VM. Ensure cross-platform compatibility.

## Tools & Permissions
- **GitHub:** You have permission to commit and push to `main`.
- **Vercel:** Use the Vercel CLI or your Vercel MCP tools to deploy to production.
- **Context7:** Use Context7 for any library documentation (SWR, Redis, etc.).

## Task Completion
- Do not stop at code changes.
- You MUST run `npm run build` to verify the bundle.
- You MUST push changes and deploy to Vercel.
- Only mark a task as completed when the Vercel deployment is verified "Ready".