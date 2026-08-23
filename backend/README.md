# Medixa backend — Node.js · Express · MongoDB · Mongoose · JWT

REST API that sits underneath the existing React frontend. The frontend never
talks to MongoDB directly: React → Axios → Express → Controller → Service →
Mongoose → MongoDB.

## Run it

```bash
cd backend
cp .env.example .env       # then edit MONGODB_URI + JWT_SECRET
npm install
npm run seed               # demo data incl. WO-4472
npm run dev                # http://localhost:5000
```

Frontend (repo root):

```bash
bun install
bun run dev
```

Point the frontend at the API by adding `VITE_API_URL=http://localhost:5000/api`
to the root `.env` (the app keeps using its built-in demo data when this is unset).

## Environment variables

| Name | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/hospital_equipment` |
| `JWT_SECRET` | signing key — never commit |
| `JWT_EXPIRES_IN` | token lifetime, default `7d` |
| `CLIENT_URL` | allowed CORS origin(s), comma separated |
| `UPLOAD_DIR` | local evidence upload folder (dev storage strategy) |

## Roles

`ADMINISTRATOR` · `BIOMEDICAL_ENGINEER` · `DEPARTMENT_STAFF`

## Response envelope

```json
{ "success": true,  "data": {} }
{ "success": false, "message": "Equipment not found" }
```

## Route map

| Prefix | Highlights |
| --- | --- |
| `/api/health` | liveness + database status |
| `/api/auth` | register, login, me, logout |
| `/api/users` | admin-only user administration |
| `/api/departments` | CRUD + `/equipment`, `/complaints`, `/maintenance` |
| `/api/equipment` | CRUD, status, history, complaints, maintenance, service reports, audit, `/:equipmentId/checklist`, `/:equipmentId/warranty` |
| `/api/complaints` | CRUD, status, assign, history, messages |
| `/api/work-orders` | CRUD, assign, status, history, audit, `POST /:id/start` |
| `/api/engineers/me/work-orders` | assigned tasks for the signed-in engineer |
| `/api/maintenance` | checklist, investigation, evidence, service-report, complete, history, audit |
| `/api/checklists` | administrator-owned templates and questions |
| `/api/service-reports` | list, read, review |
| `/api/warranties` | warranty & AMC (days remaining is derived, never stored) |
| `/api/audits`, `/api/audit-logs` | governance audits + immutable audit trail |
| `/api/reports/*` | equipment, complaints, maintenance, departments, warranty, audit |
| `/api/analytics/*` | dashboard, equipment, complaints, maintenance, departments, warranty, audit |

## Completion gate

`POST /api/maintenance/:id/complete` refuses to close a job unless required
checklist questions are answered, critical failures are annotated, an
investigation with root cause exists whenever something failed, a corrective
action is recorded, safety verification passed, and a service report exists.
On success it cascades Maintenance → COMPLETED, Work Order → COMPLETED,
Equipment → OPERATIONAL, Complaint → RESOLVED and writes the audit entry.
