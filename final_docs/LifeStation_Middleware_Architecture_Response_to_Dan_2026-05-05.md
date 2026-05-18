# Middleware architecture review — response to LifeStation

**To:** Dan Entin, LifeStation  
**From:** AllWell (AiAssistant.co)  
**Re:** Caregiver Mobile + Web — proposed app middleware (AWS)  
**Date:** May 5, 2026

---

Hi Dan,

Thank you for sending the middleware technology summary documents. We reviewed them in detail. Our assessment: **the overall design matches what we intend to deliver** — a LifeStation-owned, AWS-hosted application API layer that uses Cognito for authentication, Lambda and API Gateway for the middleware, Secrets Manager for integration credentials, orchestration across Affiliated and device APIs, event-driven push to APNs and FCM, and observability (CloudWatch, Datadog, Mixpanel), with forwarding to Sumo Logic as you describe.

Below is a concise section-by-section alignment note and a short list of decisions we’d like to confirm on our upcoming call so the SOW and estimates stay accurate.

---

## 1. Delivery model

| Topic                                                                                                                                                     | Alignment |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Middleware implemented and operated in **LifeStation AWS**                                                                                                | Aligned   |
| **LifeStation** builds specific endpoints you own (e.g. user registration, validation, consent) while we build the **middleware/BFF** in your environment | Aligned   |

---

## 2. Identity and authentication (Cognito, API Gateway, Lambda, data store, Secrets Manager)

| Topic                                                                                                    | Alignment                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Amazon Cognito** for sign-in, tokens, optional SMS MFA                                                 | Aligned                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **API Gateway + Lambda** as the secured API entry and request processing path                            | Aligned                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **AWS Secrets Manager** for downstream API and integration secrets                                       | Aligned                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Application data store for user ↔ account ↔ caregiver **relationship mapping** and authorization context | Your document allows **“DynamoDB or another application data store.”** We plan to use **PostgreSQL** for this layer (relational model, querying, auditing). **Please confirm you are OK with Postgres for mapping/authorization data** rather than DynamoDB. If LifeStation prefers DynamoDB specifically for this layer, we will accommodate; that implies a modest schedule and architecture adjustment we can quote precisely after your confirmation. |

---

## 3. Data aggregation (Lambda, API Gateway, Affiliated, Device API, Salesforce)

| Topic                                                                                                            | Alignment                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Middleware composes **one app-facing contract** from Affiliated APIs and Device API via Lambda + Secrets Manager | Aligned with v1.0 scope                                                                                                                                                                                                                                                                                                                                                                        |
| **Salesforce APIs** included in aggregation                                                                      | Aligns conceptually **if** Salesforce is in **v1.0** product scope. Our RFP read focused on Affiliated + device sources. **Please confirm which user-facing workflows in v1.0 must call Salesforce.** If Salesforce is launch-critical for defined screens, we will add explicit effort for integration and testing to the plan; otherwise we can phase it post–mobile v1 or per your roadmap. |

---

## 4. Push notifications and eventing (hooks → AWS → Lambda → APNs / FCM)

| Topic                                                                                                                                                                      | Alignment                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Event-driven** delivery (not polling), intake via **API Gateway or EventBridge**, **Lambda** processing, deduplication, lightweight payloads; full detail via secure API | Aligned                                                                                                      |
| Delivery to **APNs (iOS)** and **FCM (Android)**                                                                                                                           | Aligned — standard for native apps on both platforms                                                         |
| Recipient / device resolution data store                                                                                                                                   | We can implement this on **PostgreSQL** (consistent with §2), unless you require DynamoDB for this component |

**Note:** APNs is Apple’s push service; FCM is Google’s. Both are needed for iOS and Android; configuration uses LifeStation-controlled keys and certificates in your AWS / developer accounts.

---

## 5. Logging and analytics (CloudWatch, Sumo Logic, Datadog, Mixpanel, optional Firehose)

| Topic                                                                                                                                                          | Alignment                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CloudWatch** as the primary AWS-native log and metrics landing for Lambda/API Gateway                                                                        | Aligned — standard operating practice for this stack                                                                                                                                                                                             |
| **Datadog** and **Mixpanel**                                                                                                                                   | Aligned — consistent with the RFP                                                                                                                                                                                                                |
| **Sumo Logic** as the organization’s centralized operational log destination; routing via **CloudWatch subscription filters** and/or **Kinesis Data Firehose** | Aligned in principle. We will implement the pipeline you prefer (IAM, subscriptions/Firehose, parsing) once you confirm **whether Firehose vs. subscription-only** is required on day one and any mandatory field mappings for existing Sumo use |

---

## 6. Summary of items to confirm on the call

1. **PostgreSQL vs. DynamoDB** for relationship mapping, authorization context, and notification recipient resolution (your docs allow either; our default is Postgres).
2. **Salesforce in v1.0:** which journeys are mandatory at launch vs. phased.
3. **Inbound event hooks:** preferred intake (**HTTP/API Gateway**, **EventBridge**, or both) and ownership of hook schema, retries, and idempotency keys with upstream systems.
4. **Sumo routing:** mandatory components on launch (**Firehose** vs **subscription filters** only) and any existing parsing/dashboard requirements we must match.

We are aligned on building **net new** middleware in **your** AWS, with **no runtime dependency on AllWell-hosted systems**, consistent with our prior confirmation.

Thank you — we’ll cover the open points on our scheduled call and follow with any estimate or timeline adjustment in writing if the answers above materially change scope.

Best regards,

**AllWell (AiAssistant.co)**  
_[Name, title, contact — add before sending]_
