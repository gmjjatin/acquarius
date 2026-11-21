# Bonus: AI/LLM Design

1. Handle LLM enrichment on the ASP.NET Core backend, never directly from the browser.
2. After a ticket is committed, enqueue a job containing only its title and a redacted description.
3. Send a versioned system prompt that restricts priority to low, medium, or high and summary to 240 characters.
4. Return strict JSON and validate it with a DTO and schema before applying it.
5. Use a queue/background worker and persist the model status to keep ticket creation fast.
6. Add short HTTP/model timeouts, bounded retries, jitter, and a provider circuit breaker.
7. Cache repeated or semantically identical requests and set per-user/day token and cost budgets.
8. Strip secrets and personal data server-side; retain only approved fields and encrypt model/provider logs.
9. Use private provider endpoints or an enterprise provider with no-training guarantees.
10. Log model version, latency, status, and token cost, but never raw customer text or API keys.
