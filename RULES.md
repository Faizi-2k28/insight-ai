# Governance & Implementation Policy for IDE Agent

## 1. Core Authority Structure
This project operates under a three-layer control system:
*   **Architect (ChatGPT)** – defines phases and approval gates
*   **Overseer (Human)** – approves execution
*   **Implementation Agent (IDE Agent)** – executes tasks

The Implementation Agent must not act autonomously outside defined phase instructions.

## 2. Mandatory Phase Protocol
Before starting any phase:
1.  **Review RULES.md**
2.  **Confirm adherence in writing**:
    > "Reviewed RULES.md — All constraints acknowledged."
3.  **Provide a Preflight Plan** (if structural changes involved)
4.  **Wait for explicit approval** if required

Failure to do so is a governance violation.

## 3. Anti-Hallucination Policy (STRICT)
The agent must:
*   **Never** invent files, endpoints, tables, or configurations.
*   **Never** fabricate command outputs.
*   **Never** paraphrase logs — always paste verbatim terminal output.
*   **Never** assume environment variable values.
*   **Never** insert dummy secrets into .env.
*   **Ask** the Overseer for missing credentials.

Allowed:
*   `.env.example` with placeholders only.
*   Reporting missing credentials explicitly.

## 4. Environment Variable Rules
*   Do **NOT** modify `backend/.env` or `frontend/.env`.
*   Do **NOT** write secrets.
*   Only create:
    *   `.env.example`
    *   `.env.proposed`

If a key is required:
*   Report it under **CONSTRAINTS & REQUIRED CREDENTIALS**
*   Wait for Overseer input.

## 5. Database Safety Rules
The agent must **NOT**:
*   Drop tables.
*   Reset database.
*   Run destructive migrations.
*   Modify schema without Preflight approval.
*   Insert test data into production DB.

Before any DB structural command:
1.  Provide **Preflight Plan**.
2.  Wait for explicit “APPROVED”.

## 6. Dependency Management Rules
*   Do not upgrade dependency versions unless explicitly instructed.
*   No automatic `pip freeze` replacements.
*   No implicit dependency changes.

Any migration (uv/poetry/etc.) requires:
*   Rollback plan
*   Version parity confirmation

## 7. Code Change Principles
*   Prefer additive changes.
*   Avoid large refactors in a single phase.
*   Keep diffs small and reversible.
*   Document new scripts/tools in `RUNBOOK.md`.

## 8. Evidence Reporting Requirements
Every phase must include:
*   A) Summary of changes
*   B) Files changed (exact paths)
*   C) Commands run (verbatim)
*   D) Terminal output (verbatim)
*   E) Acceptance criteria PASS/FAIL checklist
*   F) Decision log (if applicable)
*   G) Constraints & Required Credentials section

No paraphrasing allowed for logs.

## 9. Stop Conditions
The agent must **STOP** and request guidance if:
*   A required credential is missing.
*   Schema differs from ORM unexpectedly.
*   Migration conflicts occur.
*   Dependency resolution fails.
*   A command behaves differently than expected.
*   A step risks data loss.

## 10. Architectural Integrity Rule
Do not introduce:
*   New frameworks
*   Agentic libraries
*   Major storage redesign
*   Neon migration
*   Async worker systems
Unless explicitly assigned as a phase.

## 11. Execution Authority
The agent may only execute:
*   Phase tasks explicitly assigned.
*   Commands listed in Preflight Plan (if approved).

All other changes require new instruction.
