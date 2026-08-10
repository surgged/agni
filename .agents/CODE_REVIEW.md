# Senior Software Engineering Code Review & Architectural Audit: **Agni Platform**

**Repository:** `github.com/surgged/agni`  
**Initial Audit:** August 2, 2026  
**Re-Audit & Status Verification:** August 4, 2026  
**Auditor:** Senior Software Engineer / Principal AI Architect  

---

## Executive Summary

This comprehensive code review evaluates the **Agni** repository (Go backend + Echo v5 + GORM + K3s/Buildah microVM deployment engine + React/Vite SPA). The codebase was systematically re-audited across **8 primary architectural dimensions** to verify which issues were resolved, which remain unresolved, and to identify newly introduced vulnerabilities:

1. **Build Readiness & Compilation Integrity** (Resolved)
2. **Security & Threat Surface** (Password hash leaks, IDOR in app & share routes, reflective CORS, preview path traversal)
3. **Container Build & Kubernetes Deployment Engine** (Buildah archive extraction, Pod spec update immutability)
4. **Architecture & Layering Boundaries** (DDD, CQRS, Hexagonal, GORM leakage, UoW)
5. **Data Integrity & Persistence** (Missing foreign key cascades, deployment quota race condition)
6. **Reliability, Resilience & Error Handling** (Pipeline build error swallowing)
7. **Frontend Architecture & API Contract Alignment** (Resolved payload/DTO mismatches)
8. **Test Coverage & Observability** (Minimal test coverage across 31 of 32 packages)

### Audit Status Overview
- **Resolved Issues:** 3 items (Composition root compilation fix, Frontend `api.ts` `FormData` to JSON fix, `CreateAppResponse` DTO mapping fix).
- **Unresolved / Still Present:** 14 items.
- **New Issues Discovered:** 3 items (Share handler IDOR vulnerability, hardcoded image pull secret in Temporal workflow, path containment risk in dev preview copy).

---

## Detailed Findings & Verification Status

---

### Parameter 1: Build Readiness & Compilation Integrity

#### Status: ✅ **SOLVED**
- **Previous Finding**: Compilation failure in `cmd/server/main.go` due to undefined `archiveStore` variable reference.
- **Verification**: `deploy.ServiceConfig` in [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L126-L127) correctly references `ArchiveStore: infra.S3Store`. Both `cmd/server` and `cmd/worker` compile cleanly.

---

### Parameter 2: Security & Threat Model

#### Status: ❌ **STILL PRESENT**

1. **Password Hash Leak in HTTP API Responses**:
   - In [user_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/user_handler.go#L16-L52), `userDTO` includes `Password string json:"password"`.
   - `toUserDTO` maps `Password: x.Password` (the bcrypt hashed password string). Every call to `GET /api/v1/users/{id}`, `POST /api/v1/users`, and `PUT /api/v1/users/{id}` returns password hashes in JSON responses.

```go
// user_handler.go (Lines 45-52)
func toUserDTO(x *user.User) userDTO {
	return userDTO{
		ID:       x.ID.String(),
		Name:     x.Name,
		Email:    x.Email,
		Password: x.Password, // ⚠️ LEAKS BCRYPT HASH TO FRONTEND
	}
}
```

2. **Missing AuthN & Widespread IDOR Vulnerabilities in App Handler**:
   - In [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L198-L346), endpoints for `Get`, `Deploy`, `Retry`, `UploadURL`, `Destroy`, `Logs`, and `Multipart*` **do not call `extractEmail`** and **do not verify resource ownership**.
   - Any unauthenticated caller can invoke `DELETE /api/v1/apps/{id}` or `POST /api/v1/apps/{id}/deploy` on arbitrary application UUIDs.

3. **Reflective CORS Configuration**:
   - In [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L169-L175), CORS uses `UnsafeAllowOriginFunc` returning `origin, true, nil` paired with `AllowCredentials: true`. This reflects any requesting origin while permitting credentials, opening cross-site token hijacking risks.

4. **Path Traversal in App Preview**:
   - In [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L508-L521), `Preview` resolves paths using `filepath.Join(dir, filepath.Clean(subPath))` without verifying `strings.HasPrefix(targetFile, dir)`. Traversal vectors such as `/preview/{id}/../../../../etc/passwd` can leak host files.

5. **Broken Kubernetes Docker Credentials Secret**:
   - In [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L373-L376), `EnsurePullSecret` formats `.dockerconfigjson` with empty string placeholders `""` for registry URL and base64 auth payload.

---

### Parameter 3: Container Build & Kubernetes Deployment Engine

#### Status: ❌ **STILL PRESENT**

1. **Buildah Archive Extraction Failure**:
   - In [builder.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/builder/buildah/builder.go#L51-L64), `Build` downloads the archive to `tmpDir/archive.tar.gz`. However, it **never extracts the archive** before calling `b.findDockerfile(tmpDir)`.
   - `findDockerfile` searches for `tmpDir/Dockerfile` (which doesn't exist because it's inside `archive.tar.gz`), causing automated builds to fail with `ErrNoDockerfile`.

2. **Kubernetes Immutable Resource Updates**:
   - In [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L214-L218), `Deploy` calls `Pods().Update(ctx, &pod, ...)` when re-deploying an existing pod. Pod specs are immutable in Kubernetes; this causes runtime API update errors.

3. **Unbounded Process Execution**:
   - `buildah bud` in `buildah/builder.go` runs child processes without cgroups CPU/RAM constraints or per-user concurrency quotas.

---

### Parameter 4: Architecture & Layering Boundaries

#### Status: ❌ **STILL PRESENT**

1. **Direct GORM Tags on Domain Aggregates**:
   - In [app.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/domain/app/app.go#L33-L55), the domain aggregate `App` carries `gorm:"column:..."` tags and a `TableName()` receiver, violating hexagonal domain isolation guidelines.

2. **Non-Transactional In-Memory UoW**:
   - In [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L90-L102), state mutations and outbox events are executed with in-memory UoW rather than transactional database operations.

---

### Parameter 5: Data Integrity & Persistence

#### Status: ❌ **STILL PRESENT**

1. **Missing Foreign Keys & Deletion Cascades**:
   - In [20260730140002_create_apps_and_shares.up.sql](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/db/migrations/20260730140002_create_apps_and_shares.up.sql#L1-L14), `apps.owner_email` is stored without a foreign key constraint referencing `users(email) ON DELETE CASCADE`.

2. **Deployment Quota Race Condition**:
   - In [service.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/deploy/service.go#L66-L79), `CreateUpload` counts running apps via a non-locking query outside an isolated transaction.

---

### Parameter 6: Reliability, Resilience & Error Handling

#### Status: ❌ **STILL PRESENT**

1. **Swallowed Build Errors in Fallback Pipeline**:
   - In [pipeline.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/deploy/pipeline.go#L81-L83), when `buildAndPushImage` returns an error, `Deploy` logs a warning and proceeds with Kubernetes deployment using a non-existent image.

---

### Parameter 7: Frontend Architecture & API Contract Alignment

#### Status: ✅ **SOLVED**

1. **Payload & DTO Alignment**:
   - In [api.ts](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/views/src/api.ts#L142-L149), `createApp` now correctly sends a JSON payload (`{ name, port, runtime }`) matching backend `createAppDTO`.
2. **Response DTO Alignment**:
   - `createApp` returns `CreateAppResponse` (`{ id, slug, upload_url, upload_expires_at }`), matching the backend response struct.

---

### Parameter 8: Test Coverage & Observability

#### Status: ❌ **STILL PRESENT**
- **Minimal Test Coverage**: `go test ./internal/...` reveals that **31 out of 32 packages** have `[no test files]`. Key deployment services (`deploy`, `buildah`, `workflow`, `http/v1`) remain completely untested (only [command_handler_test.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/user/command_handler_test.go) exists).

---

## 🆕 New Issues Discovered (August 4, 2026 Audit)

### 1. Missing AuthZ / IDOR in Share Handler
- **Location**: [share_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/share_handler.go#L91-L157)
- **Impact**: Endpoints `POST /api/v1/apps/{id}/share`, `GET /api/v1/apps/{id}/shares`, and `DELETE /api/v1/apps/{id}/shares/{sid}` do not check authentication or verify if the caller owns app `{id}`. Any user can create share tokens or list/revoke access for arbitrary applications.

### 2. Hardcoded Image Pull Secret in Temporal Workflow Activities
- **Location**: [activities_deploy.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/workflow/activities_deploy.go#L54)
- **Impact**: `DeployRuntime` hardcodes `ImagePullSecret: "zot-pull"`. If deployed to environments using different registry secrets, pod creation fails with `ImagePullBackOff`.

### 3. Path Containment Risk in Development Preview Asset Copy
- **Location**: [pipeline.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/application/deploy/pipeline.go#L70-L79)
- **Impact**: In dev mode asset handling, `appNameClean` is created from `app.Name`. If manipulated, directory paths outside `data/apps` could be targeted during directory copy operations.

---

## Prioritized Remediation Roadmap

| Priority | Category | Action Item | Affected File(s) |
| :--- | :--- | :--- | :--- |
| 🔴 **P0** | **Security** | Omit `Password` field from `userDTO` responses and remove mapping in `toUserDTO` | [user_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/user_handler.go#L16-L52) |
| 🔴 **P0** | **Security** | Enforce auth & ownership validation on all `AppHandler` and `ShareHandler` endpoints | [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L198-L346), [share_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/share_handler.go#L91-L157) |
| 🔴 **P0** | **Engine** | Extract `archive.tar.gz` in `Buildah.Build` before searching for `Dockerfile` | [builder.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/builder/buildah/builder.go#L51-L64) |
| 🟡 **P1** | **Security** | Add strict `strings.HasPrefix(targetFile, dir)` path validation in `Preview` | [app_handler.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/http/web/v1/app_handler.go#L508-L521) |
| 🟡 **P1** | **Security** | Restrict CORS allowed origins to explicit trusted configuration domains | [cmd/server/main.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/cmd/server/main.go#L169-L175) |
| 🟡 **P1** | **Engine** | Replace Pod `Update()` call with delete-and-recreate or Deployment resource | [provider.go](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/internal/adapters/provider/k3s/provider.go#L214-L218) |
| 🟡 **P1** | **Data Integrity**| Add `FOREIGN KEY (owner_email) REFERENCES users(email) ON DELETE CASCADE` | [20260730140002_create_apps_and_shares.up.sql](file:///Users/anurag/Desktop/anurag/project/surged/indralab/agni/db/migrations/20260730140002_create_apps_and_shares.up.sql#L1-L14) |
| 🟢 **P2** | **Testing** | Implement unit/integration tests across core verticals (`deploy`, `buildah`, `http/v1`) | `internal/...` |
