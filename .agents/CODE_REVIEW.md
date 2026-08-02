# Senior Software Engineering Code Review & Architectural Audit: **Agni Platform**

**Repository:** `github.com/surgged/agni`  
**Date:** August 2, 2026  
**Auditor:** Senior Software Engineer / Principal AI Architect  

---

## Executive Summary

This comprehensive code review evaluates the **Agni** repository (Go backend + Echo v5 + GORM + K3s/Buildah microVM deployment pipeline + React/Vite SPA). The codebase was systematically audited across **8 primary architectural dimensions**:

1. **Build Readiness & Compilation Integrity**
2. **Security & Threat Surface (AuthN, AuthZ, IDOR, Injection, CORS)**
3. **Container Build & Kubernetes Deployment Engine**
4. **Architecture & Layering Boundaries (DDD, CQRS, Hexagonal, UoW)**
5. **Data Integrity & Persistence (Migrations, GORM, Transactions)**
6. **Reliability, Resilience & Error Handling (Workflows, Retry Policies)**
7. **Frontend Architecture & API Contract Alignment**
8. **Test Coverage, Observability & Production Operations**

---

## Evaluation Parameters & Detailed Findings

---

### Parameter 1: Build Readiness & Compilation Integrity

#### Findings
- **Compilation Failure in Composition Root**: `crank test` and `go build` fail to compile due to variable reference errors in [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L131-L168).
  - `s3Store` is declared and assigned at line 132, but `archiveStore` is referenced at lines 150 & 163 without prior declaration.

```go
// cmd/server/main.go (Lines 132-168)
s3Store, err := s3.NewStore(...) // Declared as s3Store
...
deploySvc := deploy.NewService(deploy.ServiceConfig{
    ArchiveStore: archiveStore, // ERROR: undefined: archiveStore
...
```

#### 🔮 Future Risks & Impact
- CI/CD pipelines will fail immediately upon commit.
- Deployment automation will fail silently or reject builds before artifact creation.

---

### Parameter 2: Security & Threat Model

#### Findings
1. **Password Hash Leak in HTTP API Responses**:
   - In [user_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/user_handler.go#L15-L51), `userDTO` includes `Password string json:"password"`.
   - The projection function `toUserDTO` directly maps `Password: x.Password` (the hashed password string). Every call to `GET /api/v1/users/{id}`, `POST /api/v1/users`, and `PUT /api/v1/users/{id}` returns bcrypt password hashes to the frontend client over HTTP.

```go
// user_handler.go
type userDTO struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"password"` // ⚠️ LEAKS HASH TO FRONTEND
}
```

2. **Missing AuthN & Widespread IDOR Vulnerabilities**:
   - In [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L198-L364), endpoints for `Get`, `Deploy`, `Retry`, `UploadURL`, `Upload`, `Destroy`, and `Logs` **do not call `extractEmail`** and **do not verify resource ownership**.
   - Anyone on the public internet can call `DELETE /api/v1/apps/{id}` or `POST /api/v1/apps/{id}/deploy` on arbitrary app UUIDs without a valid token.

3. **Dangerous CORS Configuration**:
   - In [main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L206-L212), CORS uses `UnsafeAllowOriginFunc` returning `origin, true, nil` paired with `AllowCredentials: true`. This reflects *any* requesting origin and permits credentials, opening up cross-site token hijacking risks.

4. **Path Traversal in App Preview**:
   - In [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L508-L530), `Preview` resolves static paths using `filepath.Join(dir, filepath.Clean(subPath))` without validating if `targetFile` stays within `dir`. A path like `/preview/<id>/../../../../etc/passwd` can leak host files.

5. **Broken Kubernetes Docker Credentials Secret**:
   - In [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L364-L368), `EnsurePullSecret` formats `.dockerconfigjson` with empty string placeholders for registry URL and base64 credentials (`{"":{"username":"","password":"","auth":""}}`).

#### 🔮 Future Risks & Impact
- Off-target data leaks, credential theft via CORS/CSRF, unauthorized infrastructure destruction, and container image pull failures in production clusters.

---

### Parameter 3: Container Build & Kubernetes Deployment Engine

#### Findings
1. **Buildah Archive Extraction Failure**:
   - In [builder.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/builder/buildah/builder.go#L42-L65), `Build` downloads the presigned S3 archive to `tmpDir/archive.tar.gz`. However, it **never extracts the archive** before executing `findDockerfile(tmpDir)` or `buildah bud`.
   - `findDockerfile` searches for `tmpDir/Dockerfile` (which does not exist because it's inside `archive.tar.gz`), causing every automated S3 deployment to fail with `ErrNoDockerfile`.

```go
// builder.go
b.download(ctx, spec.ContextURL, tmpDir) // Saves to tmpDir/archive.tar.gz
dockerfile = b.findDockerfile(tmpDir)   // Looks for tmpDir/Dockerfile -> FAILS!
```

2. **Kubernetes Immutable Resource Updates**:
   - In [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L215-L218), `Deploy` attempts to call `Pods().Update(ctx, &pod, ...)` when updating an existing pod. Kubernetes pods have immutable spec fields; updating an active pod via `Update()` throws API field errors.

3. **Unbounded Process Execution & Leak Potential**:
   - Container build execution in `buildah/builder.go` runs host-level `buildah bud` child processes without cgroups CPU/RAM constraints or execution quotas per user.

#### 🔮 Future Risks & Impact
- Total failure of background container image building, pod update deadlocks on re-deploy, and host resource exhaustion (noisy neighbor DoS) during concurrent builds.

---

### Parameter 4: Architecture & Layering Boundaries

#### Findings
1. **Direct GORM Tags on Domain Aggregates**:
   - In [app.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/domain/app/app.go#L33-L51), the core domain aggregate struct `App` carries `gorm:"column:..."` tags and a `TableName()` receiver.
   - This violates the project's layering architecture ([backend-go SKILL.md](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/.agents/skills/backend-go/SKILL.md#L42-L46)), which specifies keeping domain models framework-agnostic and placing database tags in private Row DTOs (`appRow`).

2. **Non-Transactional In-Memory UoW & Event Bus**:
   - In [main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L93-L105), the composition root constructs `eventbus.NewInMemory()` and `uow.NewInMemoryUoW(...)`.
   - State mutations and event publishing do not occur within atomic database transactions. If the backend process crashes during state transitions, outbox events vanish and state machines desynchronize.

#### 🔮 Future Risks & Impact
- Database ORM leaking into domain business logic, lost domain events, and state drift between relational tables and external async consumers.

---

### Parameter 5: Data Integrity & Persistence

#### Findings
1. **Missing Foreign Keys & Deletion Cascades**:
   - In [20260730140002_create_apps_and_shares.up.sql](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/db/migrations/20260730140002_create_apps_and_shares.up.sql#L1-L14), `apps.owner_email` is stored as plain text without a foreign key constraint pointing to `users(email)`.
   - If a user is deleted from the `users` table, their `apps` rows remain orphaned in the database.

2. **Race Conditions in Deployment Quota Verification**:
   - In [service.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/deploy/service.go#L71-L84), `CreateUpload` counts running apps via a non-locking `ListByOwner` query before creating a new app. Concurrent requests from the same user can bypass `MaxRunningPerUser` limits.

#### 🔮 Future Risks & Impact
- Orphaned database rows, dangling orphaned microVM pods in K3s, and quota bypass under high concurrency.

---

### Parameter 6: Reliability, Resilience & Error Handling

#### Findings
1. **Workflow Worker Disabled in Dev Environment**:
   - In [main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L171-L188), `if cfg.App.Env != "development"` disables the embedded workflow worker during dev mode, leaving `orch` as `nil`.
   - Deployments initiated in development return `202 Accepted` but never execute because no worker is running.

2. **Swallowed Build Errors in Pipeline Fallback**:
   - In [pipeline.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/deploy/pipeline.go#L74-L76), when `buildAndPushImage` returns an error, `pipeline.Deploy` logs a warning and proceeds to attempt deployment to Kubernetes with a missing image.

#### 🔮 Future Risks & Impact
- Silent failures during local testing, cryptic `ErrImagePullBackOff` pod states on cluster deployment.

---

### Parameter 7: Frontend Architecture & API Contract Alignment

#### Findings
1. **Content-Type & Request Body Mismatch**:
   - In [api.ts](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/views/src/api.ts#L118-L127), `createApp` sends data as `FormData`:
     ```typescript
     const formData = new FormData();
     formData.append('name', data.name);
     ```
   - However, [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L155-L158) expects a JSON payload (`c.Bind(&dto)` into `createAppDTO`).

2. **Response DTO Structure Mismatch**:
   - [api.ts](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/views/src/api.ts#L126) expects `V1AppDTO` from `POST /api/v1/apps`, whereas the backend returns `createAppResponse` (`{ id, slug, upload_url, upload_expires_at }`).

#### 🔮 Future Risks & Impact
- Client-side runtime HTTP 400 Bad Request errors when creating apps from the React UI dashboard.

---

### Parameter 8: Test Coverage & Observability

#### Findings
- **Zero Test Coverage on Core Verticals**: `go test ./internal/...` reveals that **28 out of 32 packages** have `[no test files]`. Key deployment services (`deploy`, `buildah`, `workflow`, `http/v1`) are completely untested.

---

## Remediation Plan & Next Steps

To transform the Agni platform into a secure, production-grade microVM deployment system, follow this prioritized roadmap:

| Priority | Dimension | Action Item | Affected File(s) |
| :--- | :--- | :--- | :--- |
| 🔴 **P0** | **Build** | Fix `archiveStore` declaration and wiring in composition root | [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L131-L168) |
| 🔴 **P0** | **Security** | Omit `Password` field from `userDTO` and remove mapping in `toUserDTO` | [user_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/user_handler.go#L15-L51) |
| 🔴 **P0** | **Security** | Enforce JWT auth middleware and owner email checks on app CRUD routes | [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L198-L364) |
| 🔴 **P0** | **Engine** | Extract `archive.tar.gz` in `Buildah.Build` before searching Dockerfile | [builder.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/builder/buildah/builder.go#L42-L65) |
| 🟡 **P1** | **Security** | Add path containment check `strings.HasPrefix(targetFile, dir)` in `Preview` | [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L520-L529) |
| 🟡 **P1** | **Frontend**| Align frontend `createApp` payload format & type response with backend DTO | [api.ts](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/views/src/api.ts#L118-L127) |
| 🟡 **P1** | **Engine** | Replace Pod `Update()` with delete-and-recreate or Deployment resource | [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L215-L218) |
| 🟢 **P2** | **Testing** | Implement unit/integration tests for `deploy`, `app`, `buildah`, and `http` | `internal/...` |
