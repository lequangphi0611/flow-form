---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until
we reach a shared understanding. Walk down each branch of the design
tree resolving dependencies between decisions one by one.

If a question can be answered by exploring the codebase, explore
the codebase instead.

## Question format (REQUIRED)

Ask ONE question at a time using the `AskUserQuestion` tool. Do NOT dump multiple questions in a single message.

For each question:
1. Use `AskUserQuestion` with 2–4 concrete options
2. Mark your recommended option with "(Recommended)" at the end of the label
3. Add a short `description` explaining the trade-off for each option
4. Wait for the answer before moving to the next question

```
AskUserQuestion({
  questions: [{
    question: "Clear, specific question ending with ?",
    header: "2–4 word label",   // max 12 chars
    options: [
      { label: "Option A (Recommended)", description: "Why this is better and its trade-off" },
      { label: "Option B",               description: "Why someone might choose this instead" },
    ],
    multiSelect: false
  }]
})
```

After all questions are answered, summarize the decisions as a table and note any follow-up actions (backlog items, rule updates, implementation tasks).
