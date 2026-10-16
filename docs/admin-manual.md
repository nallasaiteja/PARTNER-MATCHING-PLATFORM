# Partner Matching Platform — Admin & Management Operations Manual

> **Document Version:** 1.0.0  
> **Classification:** Confidential / Operational Administrative Manual  
> **Audience:** Super Admins, System Admins, Branch Managers, Franchise Managers, and Operations Leads

---

## 1. Administrative Authentication & Two-Factor Authentication (2FA)

### 1.1 Mandatory 2FA for Admin Accounts
In compliance with Section 12.1-A, **Two-Factor Authentication is mandatory for all Admin and Super Admin accounts**. Ordinary password authentication will not grant access to the Admin Console.

#### 1.1.1 Login Procedure
1. Navigate to the login portal and enter your administrative credentials.
2. Upon submitting valid credentials, the system will verify your role and trigger the **2FA Challenge Screen**.
3. A 6-digit cryptographic verification code will be dispatched to your registered administrative channel (valid for 5 minutes).
4. Enter the 6-digit code in the 2FA prompt and click **Verify & Enter Console**.
5. The session will be granted full administrative authorization with an active audit log stamp.

> **Security Note:** The 2FA verification system enforces a strict limit of **3 consecutive failed attempts**. Exceeding 3 failed attempts invalidates the active challenge token.

#### 1.1.2 Emergency Backup Recovery Codes
If your primary 2FA channel or physical device is unavailable:
1. On the 2FA Challenge Screen, click **Lost your device? Use Emergency Recovery Code**.
2. Enter one of your 8-character backup recovery codes (e.g., `A1B2C3D4`).
3. Each backup code is single-use and is immediately consumed upon verification.
4. Once logged in, generate a new set of recovery backup codes under **Admin Profile -> Security Settings**.

---

## 2. Role Permissions & Hierarchy

| Role | Scope | Permitted Operations | Restricted Operations |
|---|---|---|---|
| **Super Admin** | Global (Entire Platform) | Complete system administration, database audit log inspection, staff creation, member data downloads, marketing & financial configuration. | None |
| **Admin** | Global (Operations) | Member verification, financial invoice approvals, leave approvals, complaints resolution, marketing campaigns, member data downloads. | Cannot modify core system security credentials or delete Super Admins. |
| **Branch Manager** | Physical Branch Only | Manage branch staff, monitor branch members, approve branch invoices, view branch financial reports, resolve local complaints. | **Cannot download bulk member data**; cannot view members outside assigned branch. |
| **Franchise Manager** | Franchise Location | Monitor franchise members, verify franchise invoices, track franchise staff attendance and local performance. | **Cannot download bulk member data**; cannot access other branches or franchises. |
| **Branch / Franchise Staff** | Assigned Scope | Assist members with profile completion, verify KYC documents, log daily attendance, handle customer inquiries. | Cannot approve invoices, cannot access financial ledgers, cannot export data. |
| **Agent** | Commission Portal | View assigned member registrations, request invoice generation, track commissions. | Isolated strictly to assigned members. |

---

## 3. Member & Profile Governance

### 3.1 Verification & KYC Approval
1. Navigate to **Admin Dashboard -> Member Management**.
2. Select **Pending Verification** to review members awaiting KYC clearance.
3. Inspect uploaded government ID proofs (Aadhaar / PAN / Passport) using secure, time-limited viewing links.
4. Verify photograph authenticity against family guidelines.
5. Click **Approve Profile** or **Reject with Clarification Reason**.

### 3.2 Member Data Export Policy (Section 12.1-F)
- Bulk downloading of member records in CSV, Excel, or PDF format is **strictly restricted to Super Admin and Admin roles**.
- Branch Managers, Franchise Managers, and staff attempting to download bulk data will receive an immediate `403 Forbidden` response.
- All download operations are permanently recorded in the central audit trail with actor details, timestamps, format, and filter scope.

---

## 4. Financial Operations & Invoice Approvals

### 4.1 Invoice Workflow
1. When an agent or staff member initiates a package subscription, an invoice is generated in `PENDING_APPROVAL` status.
2. Navigate to **Financials -> Invoices**.
3. Inspect payment transaction references (Bank Transfer, UTR, Cash Receipt).
4. Click **Approve Invoice** to mark payment as confirmed and automatically activate the member's package benefits.
5. Generate stamped tax receipts for accounting records.

---

## 5. Communications & Automated Reminders

### 5.1 Birthday Wishes
The automated notification daemon executes daily at 00:05 UTC:
- Identifies active members celebrating birthdays on that day.
- Transmits pre-approved personalized greeting templates via SMS, Email, and WhatsApp.

### 5.2 Package Expiry Alerts
- Automatically dispatches reminders 7 days and 2 days prior to membership package expiration, prompting renewals without service disruption.

---

## 6. Additional Operational Modules

### 6.1 Success Stories Moderation
- Review member-submitted success stories and wedding photos under **Modules -> Success Stories**.
- Verify that both bride and groom profiles exist on the platform.
- Click **Feature on Homepage** to publish verified stories to the public website.

### 6.2 Careers & Recruitment
- Post job openings for Branch Managers, Matchmakers, Telecallers, and Relationship Managers.
- Review submitted candidate resumes under **Recruitment -> Applications**.
- Schedule interviews and mark application status.

### 6.3 Staff Leave Management
- Review leave requests submitted by branch or franchise staff.
- Approve or reject requests with administrative remarks. The system automatically tracks leave day balances.

### 6.4 Complaints Management
- Inspect incoming member grievances under **Support -> Complaints**.
- Assign tickets to specific branch staff with SLA deadlines (e.g., 24-hour turnaround).
- Record resolution notes upon ticket closure.

### 6.5 Suggested Profiles Engine
- Tune suggestion weights under **Settings -> Matchmaking Rules**:
  - Caste compatibility weight
  - Education alignment weight
  - Age difference tolerances
- Execute batch matchmaking jobs to recalculate suggestions across the active member database.

### 6.6 Marketing & SEO Attribution
- Create tracked marketing campaigns with UTM parameters (e.g., `utm_source=facebook&utm_campaign=diwali2026`).
- Review registration conversion funnels and cost per acquisition (CPA) analytics.

---

## 7. Security Operations & Audit Trail Inspection

1. Navigate to **Security & Audit Logs**.
2. Filter logs by:
   - **Event Type:** `LOGIN`, `MEMBER_DATA_DOWNLOAD`, `PROFILE_EDIT`, `TWO_FACTOR_VERIFY`, `ROLE_CHANGE`
   - **Actor ID or Role**
   - **Date & Time Range**
3. Review anomalous activity, such as repeated failed logins or unauthorized access attempts.
4. Export compliance reports for regulatory or internal audits.
