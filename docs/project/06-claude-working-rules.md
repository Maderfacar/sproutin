# 06 — Claude Working Rules（永久工作規範）

## A. 每完成一個 Task / Milestone 必答 8 題

Claude 在每次回報時**必須**逐一回答：

1. **What did you complete?** — 列出具體檔案、功能、變更。
2. **What remains incomplete?** — 明確列出尚未完成項。
3. **Did you modify any existing Architecture Decision?** — 若有：哪一項 / 為什麼 / Evidence / Alternative / Trade-off。
4. **Did you introduce any new Technical Decision?** — 含 library / package / infrastructure / deployment mechanism / database behavior / security mechanism。
5. **What problems did you encounter?** — 格式：`Problem / Cause / Solution / Trade-off`。
6. **Did you implement anything outside the requested scope?** — 明確 **YES / NO**；YES 說明原因。
7. **How was the implementation verified?** — 區分：Static / Automated test / CI / Build / Vercel Preview / Online manual。**不得把「code written」當成「verified」。**
8. **What is the next task?** — 只提**下一個**合理 Task；不得未經批准跨越多個 Phase。

## B. Verification 語意
- `IMPLEMENTED` = code 寫好，未驗證。
- `VERIFICATION_PENDING` = 待 CI / Preview / Online 驗證。
- `ACCEPTED` = **Human Owner / Architecture Review 驗收通過**（只有他們能給）。
- Claude **永遠不得**自行標 `ACCEPTED` 或宣布 Release PASS。

## C. Claude Scope Boundary（永久）

### Claude 可以
- implementation / refactoring / tests / migration / documentation / bug fixing / technical investigation
- **提出** architecture issue（用 §D 格式）

### Claude 不可以自行
- 改變已確認 architecture
- 改變 database-per-school 決策
- 改變 frontend / backend stack
- 把 Future Domain（Health / Bus / Report / AI / Subscription / Payment）提前加入 MVP
- 增加未批准的 infrastructure
- 把自己的完成狀態當成 Human Acceptance
- 自行宣布 Release PASS
- 自行改變 deployment architecture（含 Worker/BullMQ 的 production hosting）

## D. 發現實質技術矛盾時的提案格式
不得自行修改既有決策，必須提出並**等待 Human Owner / Architecture Review**：
```text
Existing Decision
Problem
Evidence
Alternative
Trade-off
Recommendation
```

## E. Documentation Update Rule
每個重要 implementation milestone **必須同步更新**：
- 一律：`00-project-master.md`、`02-development-checklist.md`、`07-current-status.md`
- 涉及 Release：`03-release-plan.md`、`04-test-matrix.md`
- 涉及 Human Owner：`05-human-preparation.md`
- 涉及工作規則：`06-claude-working-rules.md`

**不要只改 code 而不更新 project-control documents。**

## F. 本機 vs Online
- Human Owner 不在本機跑 `pnpm dev` / `localhost`。
- 驗證走 CI + Vercel Preview + Online。
- Claude 給驗證步驟時，以 CI/Preview/Online 為主，不要求 Human Owner 本機執行開發環境。
