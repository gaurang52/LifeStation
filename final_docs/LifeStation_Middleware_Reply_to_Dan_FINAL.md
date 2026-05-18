# Response: LifeStation caregiver app middleware architecture

**To:** Dan Entin, VP Product & Technology — LifeStation  
**From:** AllWell (AiAssistant.co)  
**Subject:** Middleware technology summary — scope alignment  
**Date:** May 5, 2026

Dear Dan,

Thank you for forwarding your middleware narrative and the App Middleware Architecture Summary diagrams following our conversation. We have reviewed everything independently. Overall, **your target architecture aligns with industry-standard AWS patterns** and **matches the middleware scope we have been assuming**: a LifeStation-hosted BFF integrating Cognito, API Gateway, AWS Lambda, Secrets Manager, Affiliated monitoring and device APIs, event-triggered outbound notifications, and a layered observability stack (AWS-native telemetry plus Datadog and Mixpanel, with centralized log forwarding as you describe).

Below is our section-by-section read. Where your documents describe **capabilities** (“similar” options—e.g. API Gateway or EventBridge, DynamoDB **or another application datastore**), we retain flexibility consistent with standard practice and your wording. Where the **diagrams** depict a concrete service diagram, **we intend to deliver that topology** unless you explicitly approve an equivalent substituted service that meets your security and ops standards.

Where your material calls for **capabilities not yet locked in product scope for v1.0**, we flag them for confirmation on our scheduled call **so estimates stay accurate**.

---

### Delivery model

- **Ownership & split.** Net-new middleware in LifeStation AWS, wholly owned by LifeStation, with LifeStation-developed endpoints such as registration, validation, and consent on your side—we take this **as agreed**.
- **AllWell builds** the middleware in your environment—we take this **as agreed**.

---

### 1. Identity and authentication

- **Amazon Cognito** for authentication, token issuance, and optional MFA — **consistent with industry practice and aligned with our plan.**
- **API Gateway plus AWS Lambda** for secured API ingress and JWT validation — **aligned.**
- **AWS Secrets Manager** for integration secrets — **aligned.**
- **SMS** (including optional MFA via Cognito and AWS-hosted messaging channels) — **aligned** with SMS-based flows in the RFP; implementation will follow **LifeStation-approved** AWS messaging configuration.

**Datastore for relationship mapping and authorization**  
Your prose states middleware logic plus **“DynamoDB or another application data store.”** We intend to persist relationship and authorization context in **Amazon RDS PostgreSQL** unless LifeStation mandates **Amazon DynamoDB** for this tier (diagrams illustrate DynamoDB; your written summary explicitly permits an alternative datastore).

**Recommendation (for your confirmation):** PostgreSQL is widely used for multi-party relationship models, transactional consistency, audit-friendly queries, and a single persistence layer alongside recipient/device resolution used in alerting.

**Questions:** Confirm whether RDS PostgreSQL is acceptable for mapping and authorization data. If DynamoDB is a hard standard for this middleware, confirm that expectation and we will reflect it in the implementation plan.

---

### 2. Data aggregation and API normalization

- **Lambda-based orchestration, API Gateway, Secrets Manager, Affiliated APIs, and Device API** — **aligned with v1 middleware scope we described.**
- **Optional DynamoDB** for caching and lookup acceleration — your text marks this optional; standard practice would be to add only when performance warrants it; **we remain flexible.**

**Salesforce APIs**  
Your architecture includes Salesforce as a downstream source alongside Affiliated monitoring and Device APIs for composed **app-facing** responses. Confirm **which screens or workflows in v1.0 rely on Salesforce** at launch versus a later phase. If Salesforce-backed experiences are mandatory for launch, integrating the correct APIs, scopes, caching, failure modes, and tests is incremental scope beyond the baseline monitoring-and-device-centric read of the caregiver app; **we will provide a concise effort and timeline delta after you specify the journeys.**

---

### 3. Push notifications and event-driven processing

- **Internal events → ingress (Amazon API Gateway and/or Amazon EventBridge) → Lambda processor → normalization, deduplication, recipient resolution → delivery** — **aligned** with scalable, asynchronous notification design **(industry standard).**
- **Apple Push Notification service (APNs) for iOS** and **Firebase Cloud Messaging (FCM) for Android** — **required** for native push on both ecosystems; credentials and apps are publisher-owned (LifeStation). **Aligned.**
- **Recipient and device lookup** — **aligned** with your layered design; datastore choice aligns with §1 (**PostgreSQL unless you mandate DynamoDB**).

---

### 4. Logging, monitoring, and analytics

- **Amazon CloudWatch** as the AWS-native telemetry plane for Lambda, API Gateway, and related services — **standard and aligned** (always-on with this stack).
- **Datadog** for service health monitoring, alerting, dashboards, and selective log ingest — **aligned** with your documentation and prior RFP direction.
- **Mixpanel** for curated product-analytics events (not raw infrastructure logs) — **aligned.**

**Centralized SIEM forwarding**  
**Sumo Logic** as the centralized operational-log destination plus optional **Amazon Kinesis Data Firehose** or **CloudWatch subscription filters** routing — aligned in principle **as standard enterprise integrations**. Narrow choice of Firehose versus subscription-first routing is an **engineering and procurement detail**; confirm any **launch-day mandate** vs phased hardening **on the call.**

---

### Reference — common technical distinctions (FAQ)

These are factual industry definitions, included so product and engineering share the same vocabulary:

| Topic                      | Explanation                                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why both APNs and FCM?** | Push on **iPhone/iPad** uses **Apple APNs**; push on **Android** uses **Google FCM**. One notification service invokes both backends and applies vendor-specific payloads and credential management.                                                                    |
| **SMS versus push**        | **SMS** is carrier text (often managed via SNS or Cognito flows). **Push** uses APNs/FCM tokens with your mobile clients. Capability sets overlap for alerts but infra and onboarding differ; implementation follows **LifeStation-chosen AWS and device credentials.** |
| **Lambda**                 | Fits the **serverless BFF pattern** illustrated in your diagrams; containerized alternatives remain possible if mandated by LS enterprise standards—we would reconcile that at architecture sign-off **if required.**                                                   |

**Service checklist (planned as part of the described middleware, absent a contrary mandate from LifeStation)**

- Amazon Cognito — yes
- Amazon API Gateway — yes
- AWS Lambda — yes
- AWS Secrets Manager — yes
- Amazon CloudWatch — yes
- Datadog — yes
- Mixpanel — yes
- Kinesis Data Firehose — implement **when required** by your Sumo ingestion pattern (alternative: subscription filters initially)

---

### Items to clarify on our next call

1. **RDS PostgreSQL vs. DynamoDB** for relational mapping and notification recipient/device resolution (**prose permits either; diagrams show DynamoDB** — your preferred standard).
2. **Salesforce** — definitive list of **v1.0** user-facing requirements vs later phase.
3. **Ingress for monitoring events:** confirm API Gateway versus EventBridge (or hybrid) against your existing webhook architecture **and owning team for schema versioning and retries.**
4. **Sumo ingestion path** requirements on day one (**Firehose** vs subscription filters-first).

We appreciate the clarity of your artifact set and remain aligned on executing this **within LifeStation’s AWS accounts**, with **no dependency on AllWell-operated runtime systems** beyond standard commercial SDKs your teams approve.

Best regards,

**AllWell (AiAssistant.co)**  
_[Name · Title · Phone · Email — complete before sending]_
