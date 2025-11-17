# ELDERCARE+ HIPAA Compliance Framework

## Executive Summary

ELDERCARE+ is a healthcare technology platform that collects, stores, and transmits Protected Health Information (PHI). As such, the platform must comply with the Health Insurance Portability and Accountability Act (HIPAA) Privacy Rule (45 CFR Part 160 and Part 164, Subparts A and E) and Security Rule (45 CFR Part 164, Subparts A and C).

This document outlines the comprehensive HIPAA compliance framework for ELDERCARE+, covering:
- Administrative Safeguards
- Physical Safeguards
- Technical Safeguards
- Organizational Requirements
- Privacy Practices

**Compliance Status:** Target 100% compliance before production launch

## PHI Handled by ELDERCARE+

### Types of PHI Collected

| Data Type | Examples | Storage Location | Encryption |
|-----------|----------|------------------|------------|
| **Identifiers** | Name, address, email, phone | RDS PostgreSQL | AES-256 at rest |
| **Demographic** | Age, gender, ethnicity | RDS PostgreSQL | AES-256 at rest |
| **Health Information** | Fall events, medication schedule, adherence | TimescaleDB | AES-256 at rest |
| **Device Data** | Sensor telemetry, location | TimescaleDB | AES-256 at rest |
| **Photos** | Wound photos (if uploaded) | S3 | AES-256 at rest |
| **Communications** | Family chat messages, telemedicine | S3 + RDS | AES-256 at rest |
| **Biometric** | Breathing rate, heart rate (future) | TimescaleDB | AES-256 at rest |

### PHI Data Flow

```
┌────────────────────────────────────────────────────────────┐
│                     PHI Data Flow                           │
└────────────────────────────────────────────────────────────┘

IoT Devices (Home)
    ↓ TLS 1.3 (encrypted)
AWS IoT Core
    ↓ VPC (isolated)
Lambda Functions (processing)
    ↓
┌─────────────────────────┬──────────────────────────────┐
│   TimescaleDB (RDS)     │    S3 (encrypted bucket)     │
│   - Fall events         │    - Photos                  │
│   - Medication logs     │    - Documents               │
│   - Telemetry           │    - Backups                 │
└─────────────────────────┴──────────────────────────────┘
    ↓ TLS 1.3 (encrypted)
Backend API (ECS)
    ↓ HTTPS (CloudFront CDN)
Mobile App / Web Portal
```

All PHI transmission uses TLS 1.3 encryption (AES-256-GCM).
All PHI storage uses AES-256 encryption at rest.

## HIPAA Security Rule Compliance

### Administrative Safeguards (§164.308)

#### 1. Security Management Process (§164.308(a)(1))

**Risk Analysis (Required)**

**Frequency:** Annual + after significant changes
**Owner:** Chief Information Security Officer (CISO)
**Process:**
1. Asset inventory (all systems handling PHI)
2. Threat identification (STRIDE model)
3. Vulnerability assessment (Nessus, AWS Inspector)
4. Risk rating (Likelihood × Impact matrix)
5. Mitigation planning
6. Executive review and approval

**Latest Risk Analysis:** [Date]
**Next Scheduled:** [Date + 12 months]

**Risk Management (Required)**

**Documented Controls:**
- Encryption (TLS 1.3, AES-256)
- Access controls (RBAC, MFA)
- Audit logging (CloudWatch, immutable)
- Intrusion detection (AWS GuardDuty)
- Vulnerability management (weekly scans)
- Incident response plan
- Business continuity plan

**Sanction Policy (Required)**

**Violations Subject to Sanctions:**
- Unauthorized PHI access
- PHI disclosure without authorization
- Security policy violations
- Failure to report security incidents

**Sanctions:**
1. First violation: Written warning + retraining
2. Second violation: Suspension (1-5 days)
3. Third violation: Termination

**Responsible:** Human Resources + Legal

**Information System Activity Review (Required)**

**Audit Log Review:**
- **Frequency:** Weekly (automated alerts) + Monthly (manual review)
- **Scope:** All PHI access, modifications, deletions
- **Tools:** CloudWatch Logs Insights, Splunk
- **Owner:** Security Operations Center (SOC)

**Review Triggers:**
- Failed login attempts (>5 in 10 minutes)
- Bulk PHI downloads (>100 records)
- After-hours access
- Access from unusual locations
- Privilege escalation
- PHI deletions

#### 2. Assigned Security Responsibility (§164.308(a)(2)) (Required)

**Security Officer:** [Name], Chief Information Security Officer (CISO)
**Contact:** [Email], [Phone]
**Responsibilities:**
- Overall HIPAA Security Rule compliance
- Risk analysis and management
- Incident response coordination
- Security awareness training
- Policy development and enforcement

**Privacy Officer:** [Name], Chief Privacy Officer (CPO)
**Contact:** [Email], [Phone]
**Responsibilities:**
- HIPAA Privacy Rule compliance
- Notice of Privacy Practices
- Patient rights (access, amendment, accounting)
- Breach notification
- Business Associate Agreements

#### 3. Workforce Security (§164.308(a)(3))

**Authorization/Supervision (Addressable - Implemented)**

**Access Authorization Process:**
1. Role-based access control (RBAC) definition
2. Manager approval for access requests
3. Security Officer review
4. Automated provisioning (Okta)
5. 90-day access review

**Workforce Clearance (Addressable - Implemented)**

**Background Checks:**
- All employees handling PHI: Criminal background check
- Developers with production access: Enhanced check
- Contractors: Same as employees
- Frequency: Pre-employment + every 3 years

**Termination Procedures (Addressable - Implemented)**

**Within 1 Hour of Termination:**
1. Revoke all system access (Okta, AWS)
2. Disable email and Slack
3. Remote wipe mobile devices (MDM)
4. Collect physical access badges
5. Disable VPN access

**Within 24 Hours:**
6. Transfer ownership of PHI data
7. Audit access logs for final 30 days
8. Exit interview (confidentiality reminder)

#### 4. Information Access Management (§164.308(a)(4))

**Access Authorization (Addressable - Implemented)**

**Role Definitions:**

| Role | PHI Access Level | Systems | MFA Required |
|------|------------------|---------|--------------|
| **Super Admin** | Full (all patients) | All systems | Yes (hardware token) |
| **Clinical Staff** | Assigned patients only | Web portal, API | Yes |
| **Family Caregiver** | Assigned elder only | Mobile app | Yes |
| **Elder (Patient)** | Own data only | Mobile app | Optional |
| **Developer** | De-identified test data only | Dev/staging | Yes |
| **Support Staff** | Read-only (with logging) | Support portal | Yes |
| **Analytics** | Aggregated, de-identified | Data warehouse | Yes |

**Minimum Necessary Standard:**
- Default: No PHI access
- Principle of least privilege
- Just-in-time access for support (approved, time-limited)

**Access Establishment/Modification (Addressable - Implemented)**

**Process:**
1. Access request form (Jira)
2. Manager approval
3. Security Officer review (for PHI access)
4. Automated provisioning
5. Confirmation email to requestor + manager

**Modification:** Same process + reason for change

**Removal:** Automatic upon role change or termination

#### 5. Security Awareness and Training (§164.308(a)(5)) (Required)

**Training Program:**

**Initial Training (Required):**
- All employees: Within 30 days of hire
- Topics:
  - HIPAA basics (Privacy + Security Rules)
  - PHI handling and protection
  - Password security and MFA
  - Phishing awareness
  - Physical security
  - Incident reporting
  - Sanctions policy
- Duration: 2 hours (online + quiz)
- Passing score: 80%

**Annual Refresher (Required):**
- All workforce members
- Updated content (new threats, incidents)
- Duration: 1 hour
- Passing score: 80%

**Role-Specific Training:**
- Developers: Secure coding (OWASP Top 10)
- Support: PHI de-identification techniques
- Clinical: Telemedicine HIPAA considerations

**Security Reminders (Addressable - Implemented):**
- Monthly security tips (email, Slack)
- Quarterly phishing simulations (KnowBe4)
- Security posters in office

**Protection from Malicious Software (Addressable - Implemented):**
- Endpoint protection (CrowdStrike)
- Email filtering (Proofpoint)
- Web filtering (Cisco Umbrella)
- Regular malware awareness training

**Log-in Monitoring (Addressable - Implemented):**
- Failed login alerts (>5 attempts)
- Unusual login patterns (time, location)
- Privileged account monitoring
- Annual review of access logs

**Password Management (Addressable - Implemented):**
- Minimum 14 characters
- Complexity requirements (upper, lower, number, symbol)
- Password manager required (1Password)
- No password reuse (last 12)
- 90-day expiration (for admin accounts)
- MFA required for PHI access

#### 6. Security Incident Procedures (§164.308(a)(6)) (Required)

**Incident Response Plan:**

**Definition of Security Incident:**
- Unauthorized PHI access, use, or disclosure
- System breach or intrusion
- Malware infection
- Data loss or theft
- Denial of service attack
- Physical security breach

**Incident Response Process:**

**1. Detection & Reporting (0-1 hour)**
- Automated alerts (GuardDuty, CloudWatch)
- Manual reporting (security@eldercare.plus)
- Any employee can report
- 24/7 on-call rotation (PagerDuty)

**2. Assessment & Containment (1-4 hours)**
- Incident Commander assigned
- Scope assessment (PHI affected?)
- Immediate containment (isolate systems, revoke access)
- Evidence preservation (snapshots, logs)
- Stakeholder notification (CISO, CPO, Legal)

**3. Investigation & Eradication (4-24 hours)**
- Root cause analysis
- Affected PHI identified
- Threat eliminated
- Systems restored from clean backups

**4. Recovery & Monitoring (24-72 hours)**
- Services restored
- Enhanced monitoring
- Validation of fix

**5. Post-Incident Review (72 hours - 7 days)**
- Incident report
- Lessons learned
- Process improvements
- Training updates

**6. Breach Determination (60 days)**
- Legal review (is this a breach?)
- If yes: Breach notification process

**Incident Severity Levels:**

| Level | Definition | Response Time | Notification |
|-------|------------|---------------|--------------|
| **Critical (P1)** | Active breach, PHI exposure | <1 hour | CISO, CEO, Board |
| **High (P2)** | Potential breach, high risk | <4 hours | CISO, Exec team |
| **Medium (P3)** | Security event, low PHI risk | <24 hours | CISO, Security team |
| **Low (P4)** | Policy violation, no PHI risk | <3 days | Security team |

#### 7. Contingency Plan (§164.308(a)(7))

**Data Backup Plan (Required)**

**Backup Schedule:**
- **Database (RDS):** Automated daily backups, 35-day retention
- **TimescaleDB:** Continuous replication to standby, point-in-time recovery
- **S3:** Versioning enabled, cross-region replication
- **Configurations:** Infrastructure as Code (Terraform), Git

**Backup Testing:**
- Monthly: Restore test (random sample)
- Quarterly: Full disaster recovery drill
- Annual: Multi-region failover test

**Disaster Recovery Plan (Required)**

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 5 minutes

**Disaster Scenarios:**
- AWS region failure
- Database corruption
- Ransomware attack
- Natural disaster (office)

**Recovery Process:**
1. Declare disaster (Incident Commander)
2. Activate DR team (5 engineers)
3. Failover to DR region (us-west-2)
4. Restore from backups
5. Validate data integrity
6. Redirect traffic (Route 53)
7. Monitor and stabilize
8. Post-mortem

**Emergency Mode Operation Plan (Required)**

**Degraded Mode:**
If cloud services unavailable:
- Devices continue local operation
- Alerts queued for delivery
- Fall detection still functional
- Local data buffer (72 hours)

**Manual Procedures:**
- Phone tree for critical alerts
- Manual medication reminders (family)
- Paper logs for fall events

**Testing and Revision (Addressable - Implemented)**
- Disaster recovery drills: Quarterly
- Plan review and update: Annual
- After major infrastructure changes

**Applications and Data Criticality Analysis (Addressable - Implemented)**

| System | Criticality | RTO | RPO |
|--------|-------------|-----|-----|
| Fall detection | Critical | 1 hour | 0 (edge device) |
| Alert delivery | Critical | 1 hour | 5 minutes |
| Medication reminders | High | 4 hours | 15 minutes |
| Mobile app | High | 4 hours | 15 minutes |
| Telemedicine | Medium | 8 hours | 1 hour |
| Analytics | Low | 24 hours | 24 hours |

#### 8. Evaluation (§164.308(a)(8)) (Required)

**Compliance Evaluation Schedule:**
- **Internal Audit:** Quarterly (Security team)
- **External Audit:** Annual (Third-party auditor)
- **Penetration Testing:** Annual (Third-party)
- **Vulnerability Scanning:** Weekly (Automated)

**Evaluation Scope:**
- All HIPAA Security Rule requirements
- Technical safeguards testing
- Access control effectiveness
- Audit log completeness
- Encryption validation
- Incident response drills

**Corrective Action:**
- Findings tracked in Jira
- Remediation plan (30/60/90 days)
- Executive review monthly
- Re-audit of critical findings

### Technical Safeguards (§164.312)

#### 1. Access Control (§164.312(a)(1)) (Required)

**Unique User Identification (Required)**
- Every user has unique username/email
- No shared accounts
- Service accounts logged separately
- Device certificates (X.509) for IoT devices

**Emergency Access Procedure (Required)**
- "Break-glass" accounts for emergencies
- Requires two-person approval
- All access logged and reviewed
- Valid for 4 hours, then auto-revoke
- Monthly audit of emergency access

**Automatic Logoff (Addressable - Implemented)**
- Web portal: 15 minutes idle
- Mobile app: 30 minutes idle (configurable)
- SSH sessions: 10 minutes idle
- Database connections: 30 minutes idle

**Encryption and Decryption (Addressable - Implemented)**

**Data at Rest:**
- Database: AWS RDS encryption (AES-256)
- File storage: S3 SSE-KMS (AES-256)
- Device storage: AES-256 (embedded devices)
- Mobile app: iOS Keychain, Android Keystore

**Data in Transit:**
- API: TLS 1.3 (minimum), certificate pinning
- MQTT: TLS 1.3 + X.509 client certificates
- WebSocket: WSS (TLS 1.3)
- Internal: VPC encryption (AWS)

**Key Management:**
- AWS KMS (Hardware Security Module)
- Keys rotated annually
- Separate keys per environment (dev, staging, prod)
- Key usage audit logs

#### 2. Audit Controls (§164.312(b)) (Required)

**What is Logged:**
- All PHI access (read, write, delete)
- Authentication events (login, logout, MFA)
- Authorization changes (role assignments)
- Configuration changes (infrastructure)
- API calls (CloudTrail)
- Database queries (RDS audit log)
- File access (S3 access logs)

**Log Format:**
- Timestamp (ISO 8601, UTC)
- User ID / Device ID
- Action (CRUD operation)
- Resource (PHI record ID)
- Result (success/failure)
- Source IP address
- User agent

**Log Storage:**
- CloudWatch Logs (real-time monitoring)
- S3 (long-term storage, immutable)
- Retention: 7 years (HIPAA requirement)
- Encrypted: AES-256
- Access: CISO + authorized auditors only

**Log Monitoring:**
- Real-time alerts (anomaly detection)
- Weekly manual review (SOC team)
- Monthly compliance review (CISO)
- Annual external audit

#### 3. Integrity (§164.312(c)(1))

**Mechanism to Authenticate ePHI (Addressable - Implemented)**

**Data Integrity Measures:**
- Database transactions (ACID compliance)
- Checksums for file uploads (SHA-256)
- Digital signatures for critical data (medication schedules)
- Immutable audit logs (write-once, read-many)
- Version control (Git for code, S3 versioning for data)

**Tamper Detection:**
- File integrity monitoring (FIM) - Tripwire
- Database change auditing (triggers)
- Blockchain for medication logs (future)

#### 4. Person or Entity Authentication (§164.312(d)) (Required)

**Authentication Methods:**

| User Type | Authentication | MFA | Session |
|-----------|---------------|-----|---------|
| **Admin** | Password + MFA | Hardware token (YubiKey) | 4 hours |
| **Staff** | Password + MFA | SMS or authenticator app | 8 hours |
| **Family** | Password + MFA | SMS or authenticator app | 7 days |
| **Elder** | Password or Biometric | Optional (encourage) | 30 days |
| **Device** | X.509 certificate | N/A (certificate is MFA) | Persistent |

**Password Requirements:**
- Length: Minimum 14 characters (admin), 10 characters (users)
- Complexity: Upper, lower, number, symbol
- History: No reuse of last 12 passwords
- Expiration: 90 days (admin), 180 days (users)
- Lockout: 5 failed attempts = 30-minute lockout

**MFA Enforcement:**
- Required for all PHI access
- Bypass: Not allowed (even for CEO)
- Methods: TOTP (Google Authenticator), SMS, hardware token
- Backup codes: 10 one-time use codes

**Certificate-Based (Devices):**
- X.509 certificates issued per device
- Stored in hardware crypto module (ATECC608A)
- Certificate rotation: 90 days
- Revocation: Certificate Revocation List (CRL) checked

#### 5. Transmission Security (§164.312(e)(1))

**Integrity Controls (Addressable - Implemented)**
- TLS 1.3 with Perfect Forward Secrecy (PFS)
- HMAC for message authentication
- Checksums for file transfers (SHA-256)

**Encryption (Addressable - Implemented)**
- All PHI transmitted over TLS 1.3
- Cipher suites: AES-256-GCM preferred
- No weak ciphers (SSLv3, TLS 1.0, TLS 1.1 disabled)
- Certificate pinning (mobile apps)

### Physical Safeguards (§164.310)

#### 1. Facility Access Controls (§164.310(a)(1))

**Contingency Operations (Addressable - Implemented)**
- Backup facility: AWS us-west-2 (DR region)
- Remote work: VPN + MFA required
- Physical office backup power (UPS, generator)

**Facility Security Plan (Addressable - Implemented)**

**Office Security:**
- Badge access (RFID) - all entry points
- Security cameras (24/7 recording, 90-day retention)
- Visitor log (sign-in required, escort mandatory)
- Alarm system (after hours)
- Cleaning crew: Background checked, PHI-free zones only

**Data Center Security:**
- AWS data centers: SOC 2 Type II certified
- Physical access: AWS controls (multi-factor, biometric)
- Environmental: Fire suppression, climate control

**Access Control and Validation (Addressable - Implemented)**
- Badge deactivation upon termination
- Quarterly access audit
- Visitor access: Temporary badges, escort required

**Maintenance Records (Addressable - Implemented)**
- HVAC, security system maintenance logs
- Annual fire safety inspection
- IT equipment maintenance (servers, network)

#### 2. Workstation Use (§164.310(b)) (Required)

**Workstation Security Policy:**
- Screensaver: Auto-lock after 5 minutes
- Full disk encryption: FileVault (Mac), BitLocker (Windows)
- Antivirus: CrowdStrike (auto-update)
- Firewall: Enabled
- Automatic updates: Enforced
- Clean desk policy: No PHI on paper left unattended
- USB ports: Disabled on workstations with PHI access

#### 3. Workstation Security (§164.310(c)) (Required)

**Physical Security:**
- Cable locks for laptops in office
- Locked drawers for sensitive documents
- Shredding of paper PHI (cross-cut shredder)
- No PHI on personal devices (enforce MDM)

#### 4. Device and Media Controls (§164.310(d)(1))

**Disposal (Required)**
- Hard drives: NIST 800-88 wiping or physical destruction
- Mobile devices: Remote wipe (MDM)
- Paper PHI: Cross-cut shredding
- Certificates of destruction maintained

**Media Re-use (Required)**
- Wiping: DBAN (7-pass) before reuse
- Verification: Check for data remnants
- Documentation: Wipe logs maintained

**Accountability (Addressable - Implemented)**
- Asset inventory (laptops, phones, USB drives)
- Check-in/check-out log for equipment
- Annual asset audit

**Data Backup and Storage (Addressable - Implemented)**
- Encrypted backups (AES-256)
- Offsite storage (AWS S3 cross-region)
- Physical backup tapes: Locked safe, encrypted
- Backup testing: Monthly

## Business Associate Agreements (BAA)

### Subprocessors Requiring BAAs

| Vendor | Service | PHI Access | BAA Status |
|--------|---------|------------|------------|
| **AWS** | Cloud infrastructure | Yes (database, storage) | ✓ Signed |
| **Twilio** | SMS, voice, video (telemedicine) | Yes (phone numbers, video) | ✓ Signed |
| **SendGrid** | Email delivery | Yes (email addresses) | ✓ Signed |
| **Firebase (Google)** | Push notifications | Yes (device tokens) | ✓ Signed |
| **Sentry** | Error tracking | No (de-identified logs) | N/A |
| **Segment** | Analytics | No (de-identified events) | N/A |

### BAA Key Terms

**Required Clauses:**
1. Permitted uses and disclosures of PHI
2. Safeguards to prevent misuse
3. Reporting of security incidents and breaches
4. Return or destruction of PHI upon termination
5. Subcontractor agreements (flow-down)
6. Access to records for HHS investigations
7. Indemnification for BA violations

## Breach Notification

### Breach Determination Process

**Definition of Breach:**
- Unauthorized acquisition, access, use, or disclosure of PHI
- Compromises security or privacy of PHI
- Excludes limited data sets and de-identified data

**Risk Assessment (4-Factor Test):**
1. Nature and extent of PHI involved
2. Unauthorized person who accessed PHI
3. Whether PHI was actually acquired or viewed
4. Extent to which risk has been mitigated

**Presumption:** All incidents are breaches unless risk assessment proves otherwise

### Breach Notification Timeline

**1. Individual Notification (Without Unreasonable Delay, ≤60 Days)**

**Method:**
- First-class mail (primary)
- Email (if patient opted in)
- Telephone (if urgent)
- Substitute notice (if contact info insufficient):
  - Web notice (90 days)
  - Major media (if ≥10 people in jurisdiction)

**Content:**
- Brief description of breach
- Types of PHI involved
- Steps individuals should take
- What ELDERCARE+ is doing
- Contact information for questions

**2. Media Notification (If ≥500 Individuals in Jurisdiction)**
- Major media outlets in affected area
- Same timeline as individual notification (≤60 days)

**3. HHS Notification**
- **Large Breach (≥500 individuals):** Within 60 days, online portal
- **Small Breach (<500 individuals):** Annual report, within 60 days of year-end

**4. Law Enforcement Delay (If Requested)**
- Can delay notification if law enforcement determines it would impede investigation
- Must get written request
- Maximum delay: As long as law enforcement specifies

### Sample Breach Response

**Scenario:** Database misconfiguration exposes 1,200 patient records for 3 hours

**Timeline:**
- **Hour 0:** Breach detected (automated alert)
- **Hour 1:** Incident Commander assigned, containment started
- **Hour 2:** Misconfiguration fixed, access revoked
- **Hour 4:** Root cause identified, evidence preserved
- **Day 1:** Forensic analysis (who accessed what?)
- **Day 2:** Risk assessment (4-factor test)
- **Day 3:** Breach determination: YES
- **Day 5:** Notification draft prepared
- **Day 7:** Legal review completed
- **Day 10:** Individual notifications mailed (1,200 letters)
- **Day 10:** HHS notification submitted (online portal)
- **Day 10:** Media notification (press release)
- **Day 15:** Follow-up emails to individuals
- **Day 30:** Post-breach monitoring (credit monitoring offered)
- **Day 60:** Incident closed, lessons learned documented

## Compliance Monitoring

### Annual Compliance Checklist

**Q1 (January-March)**
- [ ] Annual risk analysis completed
- [ ] Annual workforce training completed
- [ ] Annual access review (all users)
- [ ] Annual policy review and update
- [ ] Q4 previous year audit findings remediated

**Q2 (April-June)**
- [ ] Quarterly disaster recovery drill
- [ ] Quarterly internal audit
- [ ] BAA renewals (if expiring)
- [ ] Penetration testing (annual)

**Q3 (July-September)**
- [ ] Quarterly disaster recovery drill
- [ ] Quarterly internal audit
- [ ] External HIPAA audit (annual)
- [ ] Physical security assessment

**Q4 (October-December)**
- [ ] Quarterly disaster recovery drill
- [ ] Quarterly internal audit
- [ ] Small breach annual report to HHS (if any)
- [ ] Plan next year's compliance activities

### Compliance Metrics

**KPIs (Reported Monthly to Board):**
1. **Security Incidents:** Count, severity, time to resolution
2. **Audit Findings:** Open, closed, overdue
3. **Training Compliance:** % workforce current on training
4. **Access Reviews:** % completed on time
5. **Vulnerability Remediation:** Mean time to fix critical vulnerabilities
6. **Backup Success Rate:** % successful backups
7. **Phishing Simulation:** % employees who clicked (target <5%)

## Enforcement and Penalties

### HIPAA Violation Penalties (Per Violation)

| Tier | Knowledge | Fine Range | Max Annual |
|------|-----------|------------|------------|
| **1** | Unaware | $100 - $50,000 | $1.5M |
| **2** | Reasonable cause | $1,000 - $50,000 | $1.5M |
| **3** | Willful neglect (corrected) | $10,000 - $50,000 | $1.5M |
| **4** | Willful neglect (not corrected) | $50,000 minimum | $1.5M |

### State Laws (More Stringent)
- **California:** CMIA (Confidentiality of Medical Information Act)
- **Texas:** HIPAA + state medical privacy laws
- Comply with most stringent applicable law

### Internal Sanctions

**Examples:**
- Accessing own medical record: Termination
- Accessing family member without authorization: Termination
- Snooping on patient records: Termination
- Sharing PHI with unauthorized person: Termination
- Weak password: Written warning, retraining
- Leaving workstation unlocked: Written warning
- Lost/stolen device (encrypted): Retraining
- Lost/stolen device (unencrypted): Suspension + investigation

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Next Review:** November 2026
**Owner:** Chief Privacy Officer
**Approved By:** Chief Executive Officer, General Counsel
