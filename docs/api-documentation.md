# Partner Matching Platform — Comprehensive API Documentation

> **Document Version:** 1.0.0  
> **Base URL:** `https://api.yourmatrimonydomain.com/api/v1` (Production) / `http://localhost:3000/api/v1` (Local Development)  
> **Standard Response Format:** JSON (`application/json; charset=utf-8`)

---

## 1. Authentication & Security Headers

### 1.1 Authorization Header
Protected endpoints require a Bearer token in the HTTP `Authorization` header:
```http
Authorization: Bearer <accessToken>
```

### 1.2 Rate Limiting & Security Headers
All responses include:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 2. Authentication & 2FA Endpoints

### 2.1 Member & Staff Login
- **Endpoint:** `POST /auth/login`
- **Access:** Public
- **Description:** Authenticates a user via identifier (Member ID, Mobile, or Email) and password. If the user possesses an administrative role (`SUPER_ADMIN` or `ADMIN`), a 2FA challenge is returned instead of the final token.
- **Request Body:**
```json
{
  "identifier": "admin@matrimony.com",
  "password": "SecurePassword123!"
}
```
- **Response (Standard Member/Staff - 200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "e9b28fd1-...",
    "email": "member@matrimony.com",
    "role": "MEMBER"
  },
  "memberProfile": {
    "id": "5f3a1b...",
    "memberId": "M2026000001",
    "firstName": "Suresh",
    "lastName": "Rao"
  }
}
```
- **Response (Admin Role Triggering 2FA - 200 OK):**
```json
{
  "requires2fa": true,
  "challengeToken": "eyJhbGciOiJIUzI1NiIsIn...twoFactorPending:true...",
  "message": "Two-factor authentication code sent to registered admin channel."
}
```

### 2.2 Verify Admin 2FA Code
- **Endpoint:** `POST /auth/admin/2fa/verify`
- **Access:** Bearer Challenge Token Required
- **Description:** Verifies the 6-digit OTP for the admin session. Enforces a maximum limit of 3 failed attempts.
- **Request Body:**
```json
{
  "code": "849201"
}
```
- **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...is2faVerified:true...",
  "user": {
    "id": "a1b2c3d4-...",
    "email": "admin@matrimony.com",
    "role": "SUPER_ADMIN",
    "is2faVerified": true
  }
}
```
- **Error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Invalid 2FA code. 2 attempts remaining."
}
```

### 2.3 Verify Admin Emergency Recovery Code
- **Endpoint:** `POST /auth/admin/2fa/recovery`
- **Access:** Bearer Challenge Token Required
- **Description:** Consumes a single-use 8-character emergency backup recovery code if the admin device is lost.
- **Request Body:**
```json
{
  "recoveryCode": "X8K2M9P4"
}
```
- **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...is2faVerified:true...",
  "user": {
    "id": "a1b2c3d4-...",
    "role": "SUPER_ADMIN",
    "is2faVerified": true
  },
  "message": "Recovery code accepted. Please enroll a new 2FA authenticator immediately."
}
```

---

## 3. Member Profiles & Search Endpoints

### 3.1 Search Profiles
- **Endpoint:** `GET /profiles`
- **Access:** Authenticated (Member / Staff / Admin)
- **Query Parameters:** `gender` (optional), `maritalStatus` (optional), `caste` (optional), `minAge` (optional), `maxAge` (optional), `city` (optional), `page` (default 1), `limit` (default 20).
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": "7c8e9f...",
      "memberId": "M2026000042",
      "firstName": "Ananya",
      "gender": "Female",
      "dateOfBirth": "1998-05-14",
      "caste": "Reddy",
      "education": "B.Tech, MS in CS",
      "occupation": "Software Engineer",
      "city": "Hyderabad",
      "state": "Telangana",
      "photoUrls": ["https://.../photo1.jpg"]
    }
  ],
  "total": 140,
  "page": 1,
  "totalPages": 7
}
```

### 3.2 View Detailed Profile
- **Endpoint:** `GET /profiles/:id`
- **Access:** Authenticated
- **Audit:** Automatically generates an immutable `PROFILE_VIEW` audit log record.
- **Response (200 OK):** Returns full profile details adhering to member contact privacy rules.

---

## 4. Member Data Download Restrictions (Section 12.1-F)

### 4.1 Export Member Data (CSV / PDF)
- **Endpoint:** `GET /reports/export?format=csv` OR `GET /profiles/export`
- **Access:** **SUPER_ADMIN and ADMIN ONLY** (Strictly enforced at API & Service level with 2FA check).
- **Headers Required:** `Authorization: Bearer <verifiedAdminToken>`
- **Behavior for Unauthorized Roles (Branch Manager, Franchise Manager, Staff, Agent, Member):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource: Member data export is restricted strictly to Super Admin and Admin."
}
```
- **Audit:** Generates `MEMBER_DATA_DOWNLOAD` audit log record documenting the actor, format, and filter parameters.

---

## 5. Audit Trail Inspection Endpoint (Section 12.1-H)

### 5.1 Query Audit Logs
- **Endpoint:** `GET /admin/audit-logs`
- **Access:** **SUPER_ADMIN and ADMIN ONLY**
- **Query Parameters:** `action` (e.g. `LOGIN`, `MEMBER_DATA_DOWNLOAD`, `PROFILE_EDIT`), `actorId`, `startDate`, `endDate`, `limit` (default 50).
- **Response (200 OK):**
```json
{
  "logs": [
    {
      "id": "0f81d4a2-...",
      "actorId": "c4d3e2f1-...",
      "actorRole": "SUPER_ADMIN",
      "action": "MEMBER_DATA_DOWNLOAD",
      "entityName": "MemberProfile",
      "entityId": "ALL",
      "ipAddress": "192.168.1.100",
      "outcome": "SUCCESS",
      "details": { "format": "csv", "count": 150 },
      "createdAt": "2026-10-15T18:24:00.000Z"
    }
  ],
  "total": 1
}
```

---

## 6. Additional Modules Summary

| Module | Route Prefix | Primary Roles | Key Endpoints |
|---|---|---|---|
| **Success Stories** | `/success-stories` | Public / Admin | `GET /`, `POST /` (Submit), `PUT /:id/status` (Admin Approval) |
| **Careers** | `/careers` | Public / Admin | `GET /` (Openings), `POST /:id/apply`, `POST /` (Post Job) |
| **Leave Management** | `/leave` | Staff / Manager / Admin | `GET /` (History), `POST /` (Apply), `PUT /:id/status` (Approve/Reject) |
| **Complaints** | `/complaints` | Member / Staff / Admin | `POST /` (File), `GET /` (List), `PUT /:id/status` (Resolve) |
| **Suggested Profiles** | `/suggestions` | Member / Admin | `GET /member/:id` (Auto Matches), `POST /generate` (Batch Run) |
| **Marketing & SEO** | `/marketing` | Admin | `GET /campaigns`, `POST /campaigns`, `POST /track` (Attribution) |
| **Agent Portal** | `/agent` | Branch/Franchise Agent | `GET /dashboard`, `GET /members`, `POST /invoices/request` |
| **Invoices & Billing** | `/invoices` | Manager / Admin | `GET /`, `POST /`, `PUT /:id/approve` |
