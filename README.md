# Explainable AI-Assisted Clinical Intake and Prioritisation Platform

An industry-focused healthcare technology project developed for **32040 Industry Project – Spring 2026** at the University of Technology Sydney.

## Overview

This project explores how artificial intelligence can support primary healthcare providers in reviewing and prioritising patient appointment requests.

The proposed platform collects structured and free-text symptom information, asks adaptive follow-up questions, identifies potential risk indicators and recommends an appropriate review priority.

The system is designed as a **human-supervised clinical decision-support tool**. It does not diagnose patients, replace healthcare professionals or make autonomous clinical decisions.

All recommendations must be reviewed by authorised healthcare staff.

## Project Title

**Design and Evaluation of an Explainable, Human-Supervised AI Clinical Intake and Prioritisation Platform for Primary Healthcare**

## Problem Statement

General practices, telehealth providers and allied-health clinics may receive large numbers of appointment requests each day.

These requests are often reviewed by administrative or reception staff who may have:

- limited clinical information;
- incomplete patient descriptions;
- inconsistent symptom details;
- limited time to review each request;
- difficulty identifying cases requiring earlier attention.

Traditional online booking forms usually collect static information and place requests into a standard queue. This may result in potentially urgent requests not being recognised early enough.

## Proposed Solution

The proposed system provides a structured clinical intake and prioritisation workflow.

It combines:

- adaptive patient questioning;
- natural-language processing;
- predefined safety rules;
- AI-assisted symptom interpretation;
- uncertainty and confidence handling;
- explainable recommendations;
- mandatory human review;
- role-based access control;
- audit logging and reporting.

The system recommends whether an appointment request should receive:

- routine review;
- priority review;
- immediate staff escalation.

The final decision always remains with an authorised healthcare professional or staff member.

## Example Scenario

A patient initially submits the following appointment request:

> “I have been feeling tired and slightly short of breath.”

The initial description does not contain enough information to determine the appropriate review priority.

The system asks follow-up questions relating to:

- symptom onset;
- severity;
- whether the symptoms are worsening;
- chest discomfort;
- fainting;
- confusion;
- relevant medical history;
- other potential warning indicators.

The patient then reports sudden chest pressure, sweating and discomfort extending towards the arm.

The system may then:

1. identify predefined risk indicators;
2. activate the safety-rule layer;
3. recommend immediate staff review;
4. explain which responses triggered the escalation;
5. alert authorised clinic staff;
6. display appropriate urgent-care guidance;
7. record the recommendation and triggered rules;
8. require a staff member to review and acknowledge the case;
9. record the final human decision in an audit trail.

This workflow demonstrates how AI may support prioritisation without independently diagnosing or treating the patient.

## Project Objectives

The main objectives are to:

1. Design an adaptive digital patient-intake process.
2. Develop a hybrid AI and rule-based prioritisation engine.
3. Provide clear explanations for every prioritisation recommendation.
4. Identify uncertainty, missing information and conflicting responses.
5. Ensure all recommendations remain subject to human review.
6. Design a secure staff dashboard for reviewing appointment requests.
7. Implement staff acceptance, escalation and override workflows.
8. Create an auditable record of AI and human decisions.
9. Evaluate the system using synthetic patient scenarios.
10. Develop an implementation roadmap for primary healthcare organisations.

## Research Questions

This project may investigate the following questions:

- How effectively can a hybrid AI and rule-based system identify appointment requests requiring urgent human review?
- Can adaptive questioning improve prioritisation compared with static appointment forms?
- Does explainable AI improve staff understanding and trust in prioritisation recommendations?
- How should incomplete, ambiguous or conflicting patient information be handled?
- How can uncertainty be communicated without encouraging overreliance on AI?
- What privacy, security and governance controls are required for AI-assisted healthcare intake?
- How does a hybrid system compare with rule-only and AI-only approaches?

## Intended Users

The platform may support the following user groups:

### Patients

Patients can:

- submit appointment requests;
- provide structured symptom information;
- enter free-text descriptions;
- answer adaptive follow-up questions;
- review consent and privacy information;
- receive appropriate next-step guidance.

### Reception and Administrative Staff

Administrative staff can:

- view incoming requests;
- review prioritisation recommendations;
- see explanations and triggered indicators;
- request additional information;
- escalate cases;
- allocate appointments where authorised.

### Nurses and Clinicians

Clinical users can:

- review higher-risk requests;
- accept or override recommendations;
- document the reason for a decision;
- monitor escalated cases;
- access relevant patient-submitted information.

### System Administrators

Administrators can:

- manage users and roles;
- configure system permissions;
- review audit logs;
- manage prioritisation rules;
- monitor system performance;
- review model and rule versions.

## Proposed Features

### Patient Intake

- Patient identity and consent capture
- Structured symptom selection
- Free-text symptom description
- Adaptive follow-up questions
- Detection of missing information
- Response validation
- Accessible patient interface
- Submission confirmation

### AI-Assisted Interpretation

- Natural-language processing of patient descriptions
- Extraction of symptoms, duration and severity
- Identification of potentially relevant risk indicators
- Detection of inconsistent or conflicting responses
- Confidence and uncertainty estimation
- Structured output generation

### Safety-Rule Engine

- Predefined escalation rules
- Rule-based warning indicators
- Priority thresholds
- Safe fallback behaviour
- Mandatory escalation for configured scenarios
- Rule-version tracking
- Separation between AI recommendations and safety controls

### Explainable Prioritisation

- Routine, priority or immediate-review recommendation
- Explanation of contributing factors
- Display of triggered rules
- Missing-information warnings
- Confidence and uncertainty indicators
- Clear distinction between AI output and human decisions

### Staff Review Dashboard

- Prioritised request queue
- Request details and patient responses
- Recommendation explanation
- Staff acceptance and override controls
- Escalation workflow
- Additional-information requests
- Appointment allocation
- Review status tracking

### Security and Governance

- Role-based access control
- Multi-factor authentication support
- Encryption in transit and at rest
- Consent records
- Data minimisation
- Audit logging
- Model and rule version tracking
- Data-retention controls
- Administrative monitoring

### Reporting and Analytics

- Requests by priority level
- Average review time
- Escalation volumes
- Staff override rates
- Incomplete submission trends
- AI confidence distribution
- Rule-trigger frequency
- Agreement between AI recommendations and human decisions
- False-positive and false-negative analysis during evaluation

## Proposed System Workflow

```text
Patient submits appointment request
                |
                v
Structured and free-text information collected
                |
                v
Adaptive follow-up questions generated
                |
                v
AI interprets patient responses
                |
                v
Safety-rule engine checks warning indicators
                |
                v
Prioritisation recommendation generated
                |
                v
Explanation and uncertainty information displayed
                |
                v
Authorised staff member reviews recommendation
                |
        +-------+-------+
        |               |
        v               v
Recommendation      Recommendation
accepted            overridden
        |               |
        +-------+-------+
                |
                v
Final human decision recorded in audit log
```