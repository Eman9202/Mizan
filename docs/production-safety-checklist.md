# MIZAN — Production safety & legal release gate

Date: 2026-09-22

This checklist is an engineering release gate, not a substitute for legal advice.

## Product boundary
MIZAN is positioned as a general wellness/lifestyle assistant. It must not claim to diagnose, treat, cure, prevent, monitor, or predict an individual disease or medical condition unless a separate medical-device regulatory assessment has been completed.

Do not market generated guidance as medical diagnosis, a prescription, or a replacement for a qualified healthcare professional. Do not promise guaranteed weight loss, disease improvement, or other health outcomes.

## AI transparency
At the start of direct AI interaction, clearly tell the user that MIZAN is an AI/digital assistant and not a human. Keep this disclosure clear even when using a realistic avatar or synthetic voice.

## Health-data gate
Before any production feature sends health or other personal data off-device:
- identify the controller/operator and publish valid contact details;
- document the lawful basis and, where applicable, the Article 9 condition for special-category health data;
- identify every processor/subprocessor and destination;
- document retention/deletion periods and international transfers;
- update the privacy notice before enabling the integration;
- use data minimisation and security appropriate to the risk;
- implement user rights and consent withdrawal where consent is relied upon.

Do not state that data is local-only if voice, AI, analytics, crash reporting, authentication, cloud storage, or another integration transmits it externally.

## Safety behavior
MIZAN must not tell a user to start, stop, increase, decrease, or replace prescribed medication. Potential emergencies must direct the user to appropriate local emergency/healthcare services rather than continuing normal coaching.

Pregnancy, breastfeeding, eating-disorder risk, significant pain/injury, chronic disease, medication use, and other higher-risk contexts require conservative guidance and escalation to qualified care when individualized medical advice is needed.

## Children
The current product gate blocks onboarding below age 13. This is a product restriction, not a statement that age 13 automatically satisfies every child-data rule in every market. Do not intentionally collect children's health data until the target-market child/privacy requirements and parental-consent flow have been assessed.

## Before commercial launch
- Add the legal operator/controller identity and working contact channel to Privacy and Terms.
- Confirm the actual production data flow, including microphone/audio and AI providers.
- Complete a GDPR data-flow/processor review; assess whether a DPIA is required.
- Review intended purpose and all marketing copy against EU/Swedish medical-device rules.
- Review consumer-facing health and outcome claims.
- Test deletion/withdrawal/export and microphone-denial/error paths on real devices.
- Keep dated records of the assessment and each release.

## Current repository observations
The current build already contains local-data export/reset controls, health-consent withdrawal, an under-13 onboarding block, AI disclosure language in the legal pages, and Terms/Privacy pages. Those controls should be preserved. The legal pages themselves correctly flag that operator identity/contact and external-provider details still need to be completed before production use involving server-side processing.
