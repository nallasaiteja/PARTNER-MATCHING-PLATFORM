# Architecture Overview

## Major Applications
1. **Public/Landing Pages**: For initial user acquisition.
2. **Admin & Operational Web Panel**: Desktop-first for Super Admin and HQ Staff.
3. **Branch Dashboard**: For Branch Managers and Branch Staff.
4. **Franchise Dashboard**: For Franchise Managers and Staff.
5. **Staff/Agent Portals**: For field staff and agents.
6. **Member Web Application**: Responsive interface for registered users.
7. **Member Mobile Application (Future)**: Native iOS/Android app.

## Backend/API Relationship
- A unified Node.js (NestJS) backend serves REST APIs.
- API endpoints are versioned (e.g., `/api/v1/auth`).
- Both the Web Application and future Mobile Apps consume these same endpoints.

## Database Relationship
- **PostgreSQL** handles relational data.
- **Prisma ORM** enforces the schema and relationships.
- Entities are normalized to support dynamic branches, franchises, and hierarchical locations (Country > State > District > Mandal > Village).

## Authentication Boundary
- Handled via JWT and refresh tokens.
- Passwords stored securely using bcrypt with minimum work factor 12.
- 2FA mechanisms are prepared for all administrative roles.
- Role-Based Access Control (RBAC) enforced at the API layer.

## Multi-Branch/Multi-Franchise Structure
- The `Organization` model segregates data logically. Branches and Franchises are separate entities within the database.
- Users (Staff/Agents) and Members are associated with an Organization.
- Access restrictions dynamically ensure that staff members can only access profiles they are permitted to see based on their role and organization.
