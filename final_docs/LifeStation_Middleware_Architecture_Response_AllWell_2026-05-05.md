# LifeStation Caregiver App — Middleware Architecture Response

**From:** AllWell (AiAssistant.co)
**To:** LifeStation — Dan Entin
**Date:** May 5, 2026
**Re:** Response to Middleware Architecture Documents (shared May 4, 2026)

---

We have reviewed both documents in detail. Below is our position on each item.

**Response codes:**

- **1** — Already planned. We are OK.
- **2** — Similar to what we proposed. We can adapt. We are OK.
- **3B** — We recommend a different approach for the reasons stated. Are you OK with this?
- **4** — Not in our proposal, but small effort. We will absorb it. We are OK.
- **5** — Not in our proposal. There is more work. Need to agree on scope before SOW.

---

## 1. Identity & Authentication

| Item                                                            | Response                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon Cognito — auth, sign-in, token issuance                  | **2** — Our proposal used custom JWT auth. Cognito is similar in purpose and actually reduces our implementation effort since AWS manages token issuance, SMS delivery, and session handling. We are OK.                                                                                                                                                                                                                                    |
| API Gateway + Lambda — token validation                         | **2** — Our proposal used Express middleware for this. Same purpose, we can adapt. We are OK.                                                                                                                                                                                                                                                                                                                                               |
| AWS Secrets Manager — credential storage                        | **4** — Not in our proposal. Small effort. We will absorb this.                                                                                                                                                                                                                                                                                                                                                                             |
| Optional SMS MFA via Cognito                                    | **2** — Our proposal used Twilio for SMS OTP. Cognito handles this natively — same outcome, simpler implementation. We are OK.                                                                                                                                                                                                                                                                                                              |
| Invitation flows — caregiver onboarding                         | **1** — Already planned and in scope.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Coarse roles in Cognito; fine-grained permissions in middleware | **1** — RBAC already planned. This aligns with our model. We are OK.                                                                                                                                                                                                                                                                                                                                                                        |
| Relationship / authorization data store                         | **3B** — Our proposal used PostgreSQL. We recommend Postgres (RDS) here. Caregiver-subscriber links, permissions, and account mappings are relational — Postgres handles joins, constraints, and integrity rules cleanly. Your document says "DynamoDB or another application data store" — Postgres is our recommendation. DynamoDB stays for device tokens and notification dedup where key-value is the right fit. Are you OK with this? |

---

## 2. Data Aggregation

| Item                                                                | Response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Gateway — client entry point                                    | **2** — Our proposal used Nginx. API Gateway serves the same purpose and is simpler to manage as a fully AWS-hosted service. We are OK.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AWS Secrets Manager — downstream API credentials                    | **4** — Not in our proposal. Small effort. We will absorb this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Affiliated APIs (account, profile, contact, billing, event history) | **1** — Already planned and in scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Device API (GPS, battery, fall signals, location history)           | **1** — Already planned and in scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Lambda — primary orchestration layer                                | **3B** — Our proposal used Node.js/Express. We recommend keeping Express on ECS for the data aggregation layer. Reason: Lambda + Postgres has a connection pooling problem — each Lambda invocation opens a new DB connection, which exhausts RDS limits at scale. Express holds a persistent connection pool and avoids this entirely. Your document uses the word "Recommended" for the stack — this is our recommendation for this layer. Lambda stays for push notification processing where stateless and event-driven is the right fit. Are you OK with this approach? |
| Caching / lookup support                                            | **3B** — Our proposal used Redis. We recommend Postgres + Redis/ElastiCache where caching reduces downstream API load. Are you OK?                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Salesforce APIs                                                     | **5** — Salesforce was not in the original RFP and is not in our proposal. We need to align on scope before we can commit. Two questions: (1) Is this required for v1.0 or a future phase? (2) Which Salesforce objects are needed? If required for v1.0, this adds approximately **+2–3 weeks**. We are OK to include it but need your answers before finalizing the SOW.                                                                                                                                                                                                   |

---

## 3. Push Notifications & Eventing

| Item                                                                             | Response                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event-driven model — internal hooks, not client polling                          | **2** — Our proposal included push notifications via FCM/APNs. The event-driven webhook ingestion model is similar in intent — we can adapt the pipeline to receive internal events via API Gateway and process them through Lambda before delivery. We are OK. |
| Lambda — notification processing                                                 | **2** — Lambda is well suited here. Stateless, event-driven, no persistent connection needed. We can adopt this. We are OK.                                                                                                                                     |
| DynamoDB — device token and recipient lookup                                     | **4** — Not in our proposal. DynamoDB is a good fit for key-value token lookup. Small effort. We will absorb this.                                                                                                                                              |
| APNs (iOS) and FCM (Android) — push delivery                                     | **1** — Already planned and in scope.                                                                                                                                                                                                                           |
| Deduplication via idempotency key (cs_no + event type + alarminc_no + timestamp) | **4** — Not called out in our proposal. Small effort. We will absorb this.                                                                                                                                                                                      |
| Lightweight notification payloads; full detail fetched via API                   | **1** — Already planned.                                                                                                                                                                                                                                        |

---

## 4. Logging & Analytics

| Item                                                             | Response                                                                                                                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon CloudWatch — log and metric collection                    | **4** — Not in our proposal, but automatic with Lambda and API Gateway. No real extra effort. We are OK.                                      |
| CloudWatch Alarms — alerting                                     | **4** — Small addition. We will absorb this.                                                                                                  |
| Datadog — service health, dashboards, alerting                   | **1** — Already included in our proposal.                                                                                                     |
| Mixpanel — product analytics and user behavior                   | **1** — Already included in our proposal.                                                                                                     |
| Sumo Logic + Kinesis Data Firehose — log forwarding and analysis | **4** — Not in our proposal. Integration is straightforward (CloudWatch → Kinesis → Sumo Logic). Approximately 2–3 days. We will absorb this. |
| Structured logging, redaction, separation of logs vs analytics   | **1** — Already planned.                                                                                                                      |

---

## 5. Timeline Impact

| Item                                | Impact                                         |
| ----------------------------------- | ---------------------------------------------- |
| All items above (except Salesforce) | Negligible — absorbed within original estimate |
| Salesforce (if v1.0)                | +2–3 weeks                                     |

Without Salesforce, we are confident in the original timeline. Salesforce is the only item that changes the delivery estimate.

---

## 6. Open Items — Need Your Input Before SOW

| #   | Item                                                                         | Our Ask                               |
| --- | ---------------------------------------------------------------------------- | ------------------------------------- |
| 1   | **Salesforce** — v1.0 or future phase? Which objects?                        | Confirm scope                         |
| 2   | **Postgres (RDS)** for relational and authorization data instead of DynamoDB | Confirm you accept our recommendation |
| 3   | **Express on ECS** for data aggregation layer instead of Lambda              | Confirm you accept our recommendation |

Everything else is either already in scope, a straightforward adaptation, or a small item we will absorb.

---

_Prepared by AllWell (AiAssistant.co) — May 5, 2026_
