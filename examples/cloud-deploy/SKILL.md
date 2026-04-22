---
name: cloud-deploy
description: Deploys services to a cloud platform using the cloud-cli and verifies health after deployment
version: 1.0.0
allowed-tools:
  - Read
  - Bash
  - Write
---

# Cloud Deploy Skill

This skill handles the full deployment lifecycle for services on a cloud platform. It should be activated when the user wants to deploy, update, or redeploy a service.

## When to activate

Activate this skill when the user says things like:

- "Deploy my service"
- "Push this to production"
- "Redeploy the Express app"
- "Update the deployment"

Do **not** activate for log viewing, status checks, or scaling — those are handled by `cloud-logs` and `cloud-status`.

## Workflow

### check-repo

Verify the workspace contains a deployable service:

1. Check that a `package.json` (Node) or `requirements.txt` (Python) exists
2. Confirm there are no uncommitted changes that would affect the deploy
3. If checks fail, tell the user what is missing before proceeding

### check-auth

Verify cloud credentials are available:

1. Run `cloud-cli auth status` and confirm it exits 0
2. If auth fails, guide the user through `cloud-cli login` before continuing

### generate-config

Generate the service manifest:

1. Create `.deploy/service.yaml` from the project structure
2. Set sensible defaults for replicas (1), CPU (0.5), and memory (512Mi)
3. Confirm the config with the user before deploying

### deploy

Submit the deployment:

```bash
cloud-cli deploy --file .deploy/service.yaml
```

Stream the deployment logs until the rollout completes or fails.

### verify

Check that the deployed service is healthy:

1. Poll `cloud-cli status` until the service reaches `RUNNING` state
2. If a health check URL is available, verify it returns HTTP 2xx
3. Report the service URL to the user

## Error handling

If any step fails:

- Report the error clearly to the user
- Suggest remediation steps
- Do not retry automatically unless the user asks

## Dependencies

- Cloud CLI (`cloud-cli`) — must be installed and on PATH
- `CLOUD_API_KEY` environment variable or active `cloud-cli login` session
