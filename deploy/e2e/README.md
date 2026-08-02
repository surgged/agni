# deploy/e2e/README.md
# End-to-End Fixture

Exercises the full code-deploy pipeline end-to-end against a running agni
instance.

## Prerequisites

- agni server running (local or deployed)
- Valid auth token (from login, or agent token for MCP)
- For real S3: S3 credentials configured + archive uploaded before deploy

## Usage

### Happy path (valid Dockerfile app)

```bash
# Set your auth token
AUTH_TOKEN="$(agni mcp token)"

# Run fixture with a known-good app
./deploy/e2e/fixture.sh "hello-world" happy-path
```

### Missing Dockerfile (error scenario)

```bash
AUTH_TOKEN="..." ./deploy/e2e/fixture.sh "no-dockerfile" missing-dockerfile
```

### Build failure (error scenario)

```bash
AUTH_TOKEN="..." ./deploy/e2e/fixture.sh "bad-build" build-failure
```

## What it tests

| Step | Assertion |
|------|-----------|
| Create app | Returns 201 with `id`, `upload_url` |
| Deploy | Returns 202 with `status=queued` |
| Status poll | Transitions through queued→building→deploying→live |
| Live URL | Returns HTTP <500 |
| Failed (error) | `status=failed` with correct `failed_step` |

## Timeout

120s total for the deployment to reach live or failed state.
