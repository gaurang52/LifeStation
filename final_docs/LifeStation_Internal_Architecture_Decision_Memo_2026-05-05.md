# LifeStation Caregiver App — Internal Architecture Decision Memo

**For internal AllWell use only — NOT for external sharing**
**Prepared by:** Engineering
**Date:** May 5, 2026
**Purpose:** Capture our architectural decisions, the reasoning behind each, and realistic timeline impact.

**How to read this memo**

- **§§1–5:** Technical position (hybrid AWS) vs Dan’s May 4 middleware papers and why.
- **§6:** **Scope & effort truth** — March **35 mw** bid vs **May 4 shape**; **Cognito = swap** for custom JWT in the 35, **not** +2 extra weeks; **Δ** is **API Gateway + ECS/Lambda split + notification pipeline + observability**.
- **§7:** Three delivery models, calendar view, pointers back to **§6.2** for the only **rolled-up Δ** table (avoid duplicating numbers in two places).
- **§§8–9:** Risks, external talking points, staffing.

## 1. Background

Our **`lifestation_docs/LifeStation_RFP_Proposal_Submission.md`** (March 2026) assumed standard **Node.js + Express + PostgreSQL** and priced **35 man-weeks** for mobile + web; **`final_docs/LifeStation_Shortlist_FollowUp_Responses_AllWell_2026-04-28.txt`** committed to **greenfield** and a **small buffer** (Q1.6).

On May 4, 2026, Dan shared two middleware architecture documents (see **`lifestation_docs/lifestation_app_middleware_summary.txt`** and **`lifestation_app_middleware_technical_summary.txt`**) specifying:

- Amazon Cognito for auth
- AWS Lambda for compute
- DynamoDB for data store
- Amazon API Gateway as entry point
- AWS Secrets Manager for credentials
- Amazon CloudWatch + Sumo Logic + Kinesis Data Firehose for observability
- Salesforce APIs as a new data source (NEW — not in RFP)

Our recommended position is a **hybrid architecture** that adopts Dan's vision where it adds value, and pushes back where standard patterns serve the application better.

---

## 2. Decision Summary

| Component                 | Decision                                         | Reasoning                                                                                                                                                           |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication            | **Amazon Cognito**                               | HIPAA + AWS BAA. **Program Δ:** largely a **swap** for custom JWT work **in the 35** (~net **0 mw**; see §6); **compliance** upside is the main reason we adopt it. |
| Main API compute          | **Node.js / Express on ECS Fargate**             | Best fit for BFF pattern, no cold starts, persistent Postgres connections, easier debugging                                                                         |
| Notification compute      | **AWS Lambda**                                   | Genuinely correct fit for bursty, stateless event processing                                                                                                        |
| Primary database          | **PostgreSQL (RDS)**                             | Caregiver-subscriber-account data is relational. Joins, constraints, transactions.                                                                                  |
| Token / idempotency store | **DynamoDB**                                     | Key-value lookups, native TTL, perfect for device tokens and dedup keys                                                                                             |
| Secrets management        | **AWS Secrets Manager**                          | Industry standard for API keys, DB creds. Required for HIPAA / production hygiene.                                                                                  |
| API entry point           | **Amazon API Gateway**                           | Standard AWS front door. Required for Lambda; usable for ECS too.                                                                                                   |
| Observability             | **CloudWatch + Datadog + Sumo Logic + Mixpanel** | Aligned with Dan's vision and original RFP.                                                                                                                         |
| Log forwarding            | **Kinesis Data Firehose**                        | Standard pipe to Sumo Logic. Configuration only.                                                                                                                    |

**Timeline note (ties to §6):** Choosing **Cognito** does **not** add a full duplicate of the auth work already assumed in the **35 mw** bid (custom JWT/OAuth). Program **Δ** vs **35** is driven by the **managed AWS front door + dual runtime (ECS + Lambda) + event/push pipeline + Sumo path** — see **§6.0–§6.2**.

---

## 3. Why Each Choice

### 3.1 Why Amazon Cognito (and not custom JWT)

**Original assumption (March proposal):** **Custom JWT/OAuth** (e.g. Passport-style) with server-side users/sessions — a **real slice of the 35 man-weeks**, not a trivial add-on.

**Decision:** Use **Cognito**.

**Effort accounting (same story as §6):** We **trade** custom-auth work **inside the 35** for **Cognito integration** — **~net zero** program **Δ** for “auth,” optional **+0.25–0.5 mw** for heavy invites/triggers. The **Δ** that moves **35 → ~43–50** is **AWS platform shape**, not “Cognito on top of JWT.”

**Why Cognito (compliance + ownership):**

- The original RFP **explicitly required HIPAA-compliant authentication** (Section 4.2.1 and Section 5.4)
- Cognito has an active **AWS BAA (Business Associate Agreement)** — AWS shares HIPAA security responsibility for the auth layer
- Custom auth means **AllWell defends every security decision** in HIPAA audits (password hashing, lockout, MFA, audit logs, encryption)
- Cognito handles all of that natively — saves real compliance effort, not just engineering effort
- Cognito sits inside **LifeStation's AWS account** — no lock-in to AllWell, aligns with April 28 independence commitment

**Trade-off accepted:** Cognito has a learning curve and rigid hosted UI (we'll build custom UI). Invitation flows require Lambda triggers (extra setup).

### 3.2 Why Node.js / Express on ECS Fargate (not full Lambda) for Main API

**Original assumption:** Standard Express server. We didn't specify Lambda.

**Dan's preference:** Lambda for everything.

**Decision:** Express on ECS Fargate for main API. Lambda only for notifications.

**Why we resist full Lambda for the main API:**

- This is a **medical / safety app**. Cold starts on user-facing APIs (1–2 seconds) are unacceptable when a worried caregiver opens the app to check on grandma.
- The main API is a **BFF (Backend-for-Frontend)** orchestrating multiple downstream APIs (Affiliated, Device, Salesforce). Express is the natural fit for this pattern.
- **Persistent HTTP connection pools** to downstream APIs save ~50ms per call (Lambda re-establishes connections per cold start).
- **Postgres connection pooling** works naturally on ECS (always-on container, persistent pool). Lambda + Postgres needs RDS Proxy (extra layer, extra config).
- **Easier to debug** during incidents — one log stream vs scattered CloudWatch logs across 30+ functions.
- **HIPAA audit trail** is cleaner with one application footprint.

**At LifeStation's scale (tens of thousands of users):** ECS Fargate costs ~$300–500/month — a non-issue for LifeStation.

### 3.3 Why AWS Lambda (only for push notifications / eventing)

**Decision:** Lambda is the **right tool** for Section 3 (Push Notifications).

**Why:**

- **Webhook-driven**: events arrive irregularly. No reason to keep an always-on server idle.
- **Bursty traffic**: one alarm fires → 5–10 caregivers need notifications simultaneously. Lambda parallelizes effortlessly.
- **Stateless**: receive event, look up recipients, fire push. No persistent state needed.
- **Auto-scales** for emergency mass-event scenarios (multiple alarms at once).
- **Pay-per-use** matches the sporadic event pattern.

This is exactly the workload Lambda was built for. **We embrace Lambda here.**

### 3.4 Why PostgreSQL (not DynamoDB) for primary data

**Original assumption:** Postgres + Sequelize (standard relational pattern).

**Dan's doc:** DynamoDB shown in diagrams but text says _"DynamoDB or another application data store"_ — flexibility is explicitly allowed.

**Decision:** Postgres for relational data (users, accounts, caregivers, subscribers, devices, permissions, billing, audit logs). DynamoDB **only** for device tokens and idempotency keys.

**Why:**

- The data model is **inherently relational**:
  - Caregiver ↔ Subscriber (many-to-many)
  - Subscriber ↔ Devices (one-to-many)
  - Account ↔ Plan ↔ Features (relational)
  - Roles ↔ Permissions (relational)
- A common query like _"show me all subscribers caregiver X has access to plus their devices and last alarm"_ is **one SQL query in Postgres** vs 4–5 calls + manual joins in DynamoDB.
- DynamoDB is **excellent for what it's designed for** — high-throughput key-value lookups. It is **awkward for relational joins**, which is most of this app.
- Forcing all data into DynamoDB would add **2–3 weeks of single-table-design work** with no benefit for an app at LifeStation's scale.

### 3.5 Why DynamoDB (limited use) for tokens and idempotency

**Decision:** DynamoDB for device tokens and notification idempotency keys only.

**Why:**

- **Device tokens** (FCM/APNs): pure key-value lookup, native TTL handles token expiry. Perfect fit.
- **Idempotency keys** (`cs_no + event_type + alarminc_no + timestamp`): native TTL auto-expires entries after dedup window (24h). Perfect fit.
- Both are **Lambda-facing** — DynamoDB has no connection management issue (HTTP-based, stateless).

### 3.6 Why AWS Secrets Manager

**Original assumption:** `.env` files for local dev, environment variables in deploy.

**Decision:** Secrets Manager for production.

**Why:**

- **Production-grade secrets management** is required for HIPAA. `.env` files are dev-only.
- **Encrypted at rest** by AWS KMS automatically.
- **Rotation support** for credentials.
- **IAM-controlled access** — Lambda/ECS roles fetch secrets without storing them in code or env vars.
- Standard practice — every reasonable AWS deployment uses it.

### 3.7 Why API Gateway

**Decision:** API Gateway for both webhook intake (Lambda) and as standard front door.

**Why:**

- **Required for Lambda** — Lambda needs an HTTP front door.
- For ECS, we can also put API Gateway in front, or use an ALB. Either works. API Gateway gives consistent auth/throttle layer across both compute paths.
- **Native Cognito JWT authorizer** — one config gates all endpoints automatically.

---

## 4. Recommended Architecture (Final)

```
                  ┌────────────────────────┐
                  │  Mobile App / Web App  │
                  └───────────┬────────────┘
                              │ HTTPS + Cognito JWT
                              ↓
                   ┌──────────────────────┐
                   │   Amazon API Gateway │  ← Cognito JWT validation
                   └──────────┬───────────┘
                              │
                ┌─────────────┴──────────────┐
                ↓                            ↓
   ┌────────────────────────┐    ┌──────────────────────┐
   │  ECS Fargate           │    │  AWS Lambda          │
   │  (Express main API)    │    │  (event/notification)│
   │                        │    │                      │
   │  - Auth/permissions    │    │  - Webhook intake    │
   │  - Data aggregation    │    │  - Recipient lookup  │
   │  - Affiliated API      │    │  - APNs / FCM fan-out│
   │  - Device API          │    │                      │
   │  - Salesforce (TBD)    │    │                      │
   └──────┬─────────────────┘    └──────────┬───────────┘
          │                                  │
          ↓                                  ↓
   ┌──────────────┐                ┌─────────────────────┐
   │ PostgreSQL   │                │ DynamoDB            │
   │ (RDS)        │                │ - Device tokens     │
   │ - Users      │                │ - Idempotency keys  │
   │ - Accounts   │                │ - Caregiver cache   │
   │ - Devices    │                │   (write-through    │
   │ - Caregivers │                │    from Postgres)   │
   │ - Permissions│                └─────────────────────┘
   │ - Audit logs │
   └──────────────┘

Cross-cutting:
   AWS Secrets Manager → API keys, DB creds, Salesforce OAuth
   CloudWatch          → Native AWS logs/metrics
   Datadog             → APM, dashboards, alerting
   Sumo Logic          → Centralized log analysis
   Kinesis Firehose    → CloudWatch → Sumo Logic forwarding
   Mixpanel            → Product analytics
```

---

## 5. Push Notification Pipeline — Specific Improvements

Dan's Section 3 design is directionally correct but operationally thin. We will deliver these production-grade additions:

| Improvement                                                      | Reason                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Amazon SQS** between API Gateway and Lambda                    | Durability — failed messages auto-retry, no event loss                     |
| **Dead Letter Queue (DLQ)**                                      | Persistent failures captured for manual recovery + CloudWatch alarms       |
| **HMAC-signed webhook authentication**                           | Prevents fake events from external sources                                 |
| **Token lifecycle pipeline**                                     | Auto-cleanup of dead APNs/FCM tokens (410, NotRegistered)                  |
| **HIPAA audit logging**                                          | Every notification attempt logged: who, when, type, delivered/failed       |
| **iOS Critical Alerts entitlement** (LifeStation responsibility) | Bypasses Do Not Disturb for emergency notifications                        |
| **Idempotency dedup**                                            | `cs_no + event_type + alarminc_no + timestamp` — prevents duplicate alerts |

---

## 6. What's Genuinely New vs Original Proposal

The **March 2026 proposal** (_Section 17 — Timeline & Estimates_) committed to **35 man-weeks (~1,400 hours)** and **16 calendar weeks** for **mobile + web v1.0**, with overlapping tracks (planning, UX, backend, mobile, web, QA, PM). **Mobile-only** was **~25 man-weeks (~920 hours)** / **~13 calendar weeks**. LifeStation’s **April 27** shortlist questions quote that **35 man-weeks** figure explicitly.

The proposal framed faster delivery around **prior LifeStation/Brighton and Affiliated API experience** — not a **14–20 + 4–6 person-week** split (that figure is **not** in the March submission).

The **April 28** reply committed to a **greenfield** codebase (fully LifeStation-owned, no AllWell-hosted dependencies) — **small calendar buffer (on the order of a few weeks)** was already disclosed there (**`final_docs/LifeStation_Shortlist_FollowUp_Responses_AllWell_2026-04-28.txt`**, Q1.6).

### 6.0 March stack vs hybrid — what actually changed (plain)

|                   | **March proposal (submission diagram + text)**                                                                                            | **Hybrid (May 4 / Dan alignment)**                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clients → API** | Mobile/web talk **HTTPS** to a **Node/Express** layer (often drawn as “API gateway” in the _product_ sense — **not** Amazon API Gateway). | Mobile/web talk **HTTPS** to **Amazon API Gateway** first; validated JWT from **Cognito**; then traffic splits: **main BFF still Express**, but on **ECS Fargate**, **plus** separate routes to **Lambda** for webhooks / notification fan-out. |
| **Auth**          | **Custom JWT / OAuth** (e.g. Passport-style) **inside** the backend you already priced — that work **sits in the 35 mw**.                 | **Amazon Cognito** issues tokens; apps integrate with Cognito. This is mostly a **swap** of _where_ the same ballpark of auth effort lands — **not** “everything in the 35 **plus** two extra Cognito-only weeks.”                              |
| **Compute**       | Mostly **one** long-running Node service (Express/Fastify) + Redis/Postgres mental model.                                                 | **Two** AWS compute styles: **ECS** (always-on BFF) **and** **Lambda** (event-driven notification path). **Lambda is new** for that path.                                                                                                       |
| **Data stores**   | **Postgres** (+ Redis in the diagram).                                                                                                    | **Still Postgres** for core app data; **DynamoDB** added **only** for things like device push tokens + idempotency keys (small, bundled under the notification row below).                                                                      |
| **Secrets**       | Env / deployment pattern in the bid.                                                                                                      | **Secrets Manager** + IAM roles — part of the “AWS prod” row below.                                                                                                                                                                             |
| **Observability** | Datadog / Mixpanel etc. in RFP.                                                                                                           | Same plus **Sumo + Kinesis/Firehose** path LifeStation described — **incremental** wiring.                                                                                                                                                      |

**Takeaway:** The **35 mw** was fair for **Node + Postgres + custom auth + normal REST**. The **extra** planning load is **not** “Cognito = +2 on top of custom auth,” it is **API Gateway + dual runtime (ECS + Lambda) + full notification/event pipeline + enterprise observability plumbing**.

### 6.1 RFP checklist (qualitative) — May 4 middleware doc

| Item                                      | Original RFP?                     | Notes (not the same as **mw**)                                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIPAA-grade auth                          | ✅ In RFP                         | March assumed **custom JWT/OAuth**; May 4 names **Cognito** — similar _overall auth effort_, different **integration** work                                                                                          |
| Cognito (named)                           | ❌ Not named in RFP               | **Net ~0 mw vs March** if we treat it as **replacing** custom JWT work **already inside the 35** — same auth budget, different product (see §6.0). Optional **+0.25–0.5** if heavy invitation/Lambda-trigger polish. |
| API Gateway                               | 🟡 Implied / AWS-aligned          | Front door, JWT authorizer, routing — real eng. in §6.2 (not “zero”)                                                                                                                                                 |
| Secrets Manager                           | 🟡 Best practice                  | Part of prod middleware shape                                                                                                                                                                                        |
| Lambda (push / events)                    | 🟡 Push in RFP; **shape** evolved | Full pipeline in §6.2                                                                                                                                                                                                |
| DynamoDB (tokens / idempotency)           | 🟡 Optional in Dan’s text         | Small; bundled with notification pipeline in §6.2                                                                                                                                                                    |
| **Salesforce APIs**                       | ❌ Not in RFP                     | **Net new product scope** if in v1.0                                                                                                                                                                                 |
| Sumo + Kinesis Firehose                   | ❌ Not in RFP                     | Ops integration; **partial** of observability row in §6.2                                                                                                                                                            |
| SQS / DLQ, token lifecycle, HMAC webhooks | ❌ Not all in Dan’s short summary | **Not** separate “a few days” only — they sit **inside** the event/push bucket in §6.2                                                                                                                               |

### 6.2 Effort increase breakdown (**Δ mw** vs the **35** — after Cognito **swap**)

**Important:** The **first row is ~0** on purpose — we are **not** charging **+1.5–2 Cognito** _on top of_ the custom-auth work that was **already assumed** in the **35**. The increase is **AWS gateway + Lambda event path + ops shape**.

| Area                                                           |       **Δ mw** | Why this is new vs “Node.js only in the bid”                                                                                                                                                                                                  |
| -------------------------------------------------------------- | -------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cognito vs custom JWT**                                      |   **~0** (net) | March **35** already included **building and wiring HIPAA-grade login** (custom). Cognito **replaces** that slice — ~**same total auth effort**, different integration. Optionally **+0.25–0.5** for edge cases (complex invites / triggers). |
| **API Gateway + Infra (Secrets, IaC/CD, ECS + Lambda deploy)** | **+2.25–3.25** | March: clients → Express. **Now:** managed **API Gateway**, Cognito **JWT authorizer**, **two** deploy surfaces (**ECS** BFF + **Lambda**), **Secrets Manager** — this layer **did not exist** in the March architecture picture.             |
| **Notification / event system**                                |   **+2.5–3.5** | **AWS Lambda** (not the main BFF), **SQS/DLQ**, webhooks, **DynamoDB\*** tokens + idempotency, token lifecycle — the **product** had push; this is the **full middleware** shape Dan described.                                               |
| **Observability**                                              |     **+0.5–1** | Sumo + Firehose routing **increment** on top of baseline Datadog/Mixpanel.                                                                                                                                                                    |
| **Subtotal (middleware — no Salesforce)**                      |     **+~6–10** | Typical midpoint still **~8 mw**; band is **API + Lambda path + observability**, **not** a second full Cognito project.                                                                                                                       |
| **Salesforce (optional)**                                      |       **+2–4** | Not in original RFP.                                                                                                                                                                                                                          |

\*DynamoDB **for tokens/idempotency** only — bundled here; not “Dynamo as main DB.”

**Reconciliation (no Salesforce):**

|                                                                |                                mw |
| -------------------------------------------------------------- | --------------------------------: |
| March program bid (includes custom auth in the rollup)         |                            **35** |
| Apr 28 greenfield buffer (already communicated to LifeStation) | _few weeks — see shortlist reply_ |
| May 4 AWS middleware shape (**§6.2**, Cognito **~0** net)      |                        **+~6–10** |
| **Hybrid program (typical planning band)**                     |                        **~43–50** |

The **~43–50** band allows **Apr 28** buffer and rounding; the **pure “May 4 shape”** slice is the **+~6–10** column, with **Cognito not double-counted** against the **35**.

So: **~8** is **API Gateway + dual compute + notification Lambda stack + observability**, **not** “Cognito +2 on top of JWT we didn’t remove from the 35.”

---

## 7. Timeline Impact — Realistic Estimates

### 7.0 Three delivery models — program timeline (man-weeks)

**Definitions:** **Man-weeks (mw)** = one engineer full-time for one week (same unit as the March **35 mw** bid). **Calendar weeks** depend on how many people run in parallel; the March plan used **~16 calendar weeks** for **mobile + web** with **overlapping** UX/backend/mobile/web/QA tracks.

Use this section when explaining **why effort goes up** after the **May 4 AWS middleware shape**: **Amazon API Gateway**, **Secrets Manager**, **ECS + Lambda** (two compute paths), **event/notification Lambda** pipeline, **Sumo/Firehose** — vs a single **Express** edge in the March diagram. **Cognito** is mostly a **swap** for custom JWT **already counted in the 35** (§6.0–§6.2).

#### 7.0.1 Summary: three architectures

| Model                                              | What it is                                                                                                                                                                                                                                                                               | Program total (typical)                                                                                                                                                                                                                | Calendar (rule of thumb)                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **A — Original proposal stack**                    | **Express/Fastify** BFF, **custom JWT / OAuth** (e.g. Passport-style), **Postgres + Redis**, Nginx/EC2-style hosting, push via **FCM/APNs** as in the March doc — **no** Cognito-as-IdP, **no** API Gateway/Lambda BFF                                                                   | **35 mw** as bid; **+2–4 mw** for **Apr 28 greenfield** (disclosed “few weeks” buffer) → **~37–39 mw**                                                                                                                                 | **~16–19 weeks** wall-clock at similar parallelism to the bid |
| **B — Hybrid (this memo)**                         | **Cognito** (+ MFA/invitation Lambdas), **API Gateway**, **Secrets Manager**, **ECS Fargate** for **main Express BFF**, **Postgres (RDS)**, **Lambda** for **notifications only** + **SQS/DLQ**, **DynamoDB** for device tokens + idempotency, **Sumo + Kinesis** path, Datadog/Mixpanel | **~43–50 mw** without Salesforce (**35** March bid **+ small buffer already stated Apr 28** **+ ~6–10 mw** May 4 AWS shape — **Cognito net ~0 vs custom auth in 35**; see §6.2); **+2–4 mw** if **Salesforce in v1.0** → **~45–54 mw** | **~17–22 weeks** at **~2.5 effective FTE**; see §7.3          |
| **C — “AWS middleware as written” (Lambda-first)** | Same as **B**, but **primary BFF / aggregation on Lambda** (many functions), relational access via **RDS Proxy + Postgres** _or_ pressure to hold **core app data in DynamoDB** per diagram emphasis                                                                                     | **+~5–9 mw** on top of **B** (IaC sprawl, cold-start tuning, RDS Proxy **or** **2–3 mw** single-table-style Dynamo work) → **~48–59 mw** no Salesforce; **~50–63 mw** with Salesforce                                                  | **~19–25+ weeks** at **~2.5 FTE** before extra staffing       |

**Salesforce** was **not** in the original RFP; add **+2–4 mw** to **any** row above if v1.0 must aggregate Salesforce.

#### 7.0.2 Where the extra man-weeks go (incremental drivers)

**Greenfield** timeline/cost impact was already addressed in **`final_docs/LifeStation_Shortlist_FollowUp_Responses_AllWell_2026-04-28.txt`** (Q1.6: “small buffer, few weeks”); it is **not** itemized again as a Δ row in **§6.2**.

Below is **line-item detail** for **Model B**. It should land in the **same ~6–10 mw total** as the **rolled-up** table in **§6.2** (Cognito **~0 net**). **Do not** add §6.2 and this table together — pick one view.

| Capability / AWS choice                                                                                                     | Not in March proposal stack?                      | **Hybrid (B)** — extra mw                                                                             | **Full Lambda / Dynamo emphasis (C)** — extra vs **B**      |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Amazon Cognito** (swap for **custom JWT** budget **inside** the **35**)                                                   | Yes                                               | **~0 net** (same auth _allowance_, different product; optional **+0.25–0.5** triggers/invites polish) | **—**                                                       |
| **Cognito triggers / invitation Lambdas**                                                                                   | Yes                                               | **incl.** in row above                                                                                | **—**                                                       |
| **API Gateway** (routes, stages, throttling, **Cognito JWT authorizer**)                                                    | Yes                                               | **+0.75–1.25**                                                                                        | **+0–0.5** (more routes if BFF is shattered across Lambdas) |
| **AWS Secrets Manager** + IAM wiring                                                                                        | Partial (we assumed env-based prod pattern)       | **+0.25–0.5**                                                                                         | **—**                                                       |
| **IaC + CI/CD** (VPC, ECS service, Lambda deploy, secrets bootstrap)                                                        | Partial                                           | **+0.75–1.5**                                                                                         | **+1–2** (more artifacts if **many** Lambdas)               |
| **ECS Fargate** (tasks, networking, logging) vs “EC2 + Nginx” mental model                                                  | Yes                                               | **+0.25–1.0**                                                                                         | Replaced by Lambda BFF cost below                           |
| **Lambda notification pipeline** (webhook/HMAC, **SQS + DLQ**, fan-out, **DynamoDB** tokens + idempotency, token lifecycle) | Partial (RFP/proposal: push, not this full shape) | **+2.5–4.0**                                                                                          | **—** (same event path)                                     |
| **Sumo Logic + Kinesis Data Firehose** (and subscription plumbing)                                                          | Partial                                           | **+0.4–0.75**                                                                                         | **—**                                                       |
| **Main BFF on Lambda** + **RDS Proxy** + connection/cold-start strategy                                                     | Yes                                               | **—**                                                                                                 | **+3–6**                                                    |
| **DynamoDB as primary store** for **relational** caregiver/subscriber/device data                                           | Yes                                               | **—**                                                                                                 | **+2–3** (per §3.4; single-table / access-pattern work)     |
| **Salesforce** aggregation in middleware                                                                                    | Yes                                               | **+2–4**                                                                                              | **+2–4**                                                    |

**How to read it:** **B program total** ≈ **35** (March, includes custom auth) **+ Apr 28 buffer** **+ ~6–10** (**API Gateway / IaC / ECS+Lambda** + **notification Lambda pipeline** + **observability** — Cognito **~0 net** vs JWT in the 35) → **~43–50 mw**. **C** adds **~5–9 mw** of **BFF + data-store** tax on top of **B**.

### 7.1 Original proposal estimate (March 2026 — what we told LifeStation)

Per **`lifestation_docs/LifeStation_RFP_Proposal_Submission.md`** Section 17:

| Scope                            | Effort                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| **Mobile + web v1.0**            | **35 man-weeks** (~1,400 hours); **16 calendar weeks** end-to-end (parallel tracks) |
| **Mobile-only** (if web dropped) | **~25 man-weeks** (~920 hours); **~13 calendar weeks**                              |

Phase labels in the proposal (for reference): Planning 1 wk; UX 3 wks; Backend 6 wks; Mobile 12 wks; Web 8 wks; QA 4 wks; PM ~2 wks partial — rolled up to the **35 man-week** total above, **not** a “14–20 + 4–6” breakdown.

### 7.2 Hybrid (Model B) — **35 mw** baseline vs **Δ**

The March proposal is **35 mw** total for mobile + web (§7.1). **Greenfield** and the **“small buffer, few weeks”** were already communicated in **`final_docs/LifeStation_Shortlist_FollowUp_Responses_AllWell_2026-04-28.txt`** (Q1.6) — **not** repeated as a Δ row here.

**Authoritative Δ table (May 4 AWS shape, no Salesforce):** **§6.2** — **Cognito ~0 net** vs custom JWT in the **35**; **+~6–10 mw** from **API Gateway + Infra + notification Lambda stack + observability**.

#### Approximate composition of the **35 mw** (for stakeholder context only)

| Section                                                                                | ~Load inside **35 mw** |
| -------------------------------------------------------------------------------------- | ---------------------: |
| Mobile                                                                                 |                    ~12 |
| Web                                                                                    |                     ~8 |
| Backend (API + Postgres + Affiliated/Device wiring, incl. **custom-auth-shaped** work) |                     ~6 |
| QA / store / security pass                                                             |                     ~4 |
| Planning, UX, PM (parallel overlap)                                                    |                     ~5 |
| **Total**                                                                              |                 **35** |

#### Quick read for stakeholders

|                                                             |                     Man-weeks |
| ----------------------------------------------------------- | ----------------------------: |
| **March bid**                                               |                        **35** |
| **+ Apr 28** (greenfield buffer — already told LifeStation) | _per Q1.6 in shortlist reply_ |
| **+ May 4** (AWS shape — **§6.2** only)                     |                    **+~6–10** |
| **Hybrid Model B (no Salesforce)**                          |                    **~43–50** |
| **+ Salesforce in v1.0**                                    |                      **+2–4** |
| **Hybrid with Salesforce**                                  |                    **~45–54** |

_(§7.0.2 = optional line-item breakout of the same **~6–10** band; §7.3 = calendar.)_

### 7.3 Calendar timeline vs September 2026 launch

**Formula:** `program man-weeks ÷ effective parallel FTE ≈` wall-clock weeks (rough).

If kickoff is **early June 2026**, **~2.5 effective FTE**:

- **Model B (hybrid):** **~43–50 mw** (no Salesforce) ÷ 2.5 ≈ **17–20 calendar weeks**; **~45–54 mw** (with Salesforce) ÷ 2.5 ≈ **18–22 calendar weeks** → typically **late September–October 2026** with June kickoff
- **Model C (Lambda-first BFF, per §7.0):** **~48–59 mw** (no SF) or **~50–63 mw** (with SF) ÷ 2.5 ≈ **19–25+ calendar weeks** → often pushes **later** unless FTE or scope increases

**March bid** (**35 mw**, **~16 calendar weeks**) and **Model A post-greenfield** (**~37–39 mw**) are **shorter** than **B/C** because they **omit the May 4 managed AWS middleware shape** — **Amazon API Gateway**, **Secrets/IaC**, **ECS + Lambda** (dual runtime), **full notification/event pipeline** (SQS, webhooks, DynamoDB tokens, etc.), **Sumo/Firehose** plumbing. **Cognito vs custom JWT is not the main gap** (that is ~**effort-neutral** in the bid); the gap is **platform integration**.

**September 2026** is still plausible for **Model B** only with **timely kickoff**, **senior AWS coverage** or a **narrow Salesforce v1** call, and **~3+ effective FTE**; otherwise plan **October–November**.

---

## 8. Risk Summary

| Risk                                                                 | Likelihood | Mitigation                                                                                                                  |
| -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Cognito learning curve eats time                                     | Medium     | Mostly a **swap** for custom auth in the **35**; still **first-build** risk on pools/triggers — POC early or staff AWS lead |
| Lambda IaC complexity (deploying 30+ functions)                      | Medium     | Use AWS SAM or Serverless Framework, set up CI/CD early                                                                     |
| Salesforce scope larger than disclosed                               | High       | Push for clarification BEFORE SOW signature                                                                                 |
| Apple Critical Alerts entitlement delay                              | Medium     | LifeStation must apply early; can take weeks for Apple approval                                                             |
| HIPAA review cycle delays                                            | Low–Medium | Engage LifeStation security/compliance team in week 1                                                                       |
| Postgres connection management on Lambda (if Dan pushes full Lambda) | Medium     | We push back to keep Express on ECS for main API                                                                            |

---

## 9. Final Recommendations

### To Dan (external reply doc)

- Affirm alignment with Cognito, API Gateway, Secrets Manager, CloudWatch, Datadog, Mixpanel, Sumo Logic, Kinesis Firehose
- Recommend **Postgres** for relational data (his doc allows this flexibility)
- Recommend **Express on ECS** for main API (technical merits)
- Affirm **Lambda for notifications** (correct fit)
- Recommend **SQS buffer** for notification durability (production standard)
- Flag **Salesforce** as scope clarification needed
- Disclose timeline impact: revised estimate confirmed within 5 business days of award (per April 28 commitment)

### Internal staffing

- Bring one senior AWS engineer in week 1
- Plan around **§7.0 Model B**: **~43–50 mw** (no SF) or **~45–54 mw** (SF in v1)
- If **Model C** is forced, add **~5–9 mw** (see §7.0)

### Non-negotiable

- HIPAA compliance posture (Cognito BAA + audit logging + encryption)
- Postgres for relational data — DynamoDB-only would add 2–3 weeks of work for no benefit
- Express on ECS for main API — full Lambda is suboptimal for this app type

---

_End of memo. Internal AllWell use only. External reply to Dan: e.g. **`final_docs/LifeStation_Middleware_Architecture_Response_to_Dan_2026-05-05.md`** (or **`LifeStation_Middleware_Reply_to_Dan_FINAL.md`**) — not this memo._
