---
name: tfy-deploy
description: Deploys services to TrueFoundry using the tfy CLI and verifies health after deployment
version: 1.0.0
allowed-tools:
  - Read
  - Bash
  - Write
---

# TrueFoundry Deploy Skill

This skill handles the full deployment lifecycle for services on the TrueFoundry platform. It should be activated when the user wants to deploy, update, or redeploy a service.

## When to activate

Activate this skill when the user says things like:

- "Deploy my service to TrueFoundry"
- "Push this to TrueFoundry"
- "Redeploy the FastAPI service"
- "Update the deployment on TFY"

Do **not** activate for log viewing, status checks, or scaling — those are handled by `tfy-logs` and `tfy-status`.

## Workflow

### `preflight.check_repo`

Verify the workspace contains a deployable service:

1. Check that a `requirements.txt` or `pyproject.toml` (Python) or `package.json` (Node) exists
2. Confirm there are no uncommitted changes that would affect the deploy
3. If checks fail, tell the user what is missing before proceeding

### `preflight.check_auth`

Verify TrueFoundry credentials are available:

1. Run `tfy auth status` and confirm it exits 0
2. If auth fails, guide the user through `tfy login` before continuing

### `deploy.generate_config`

Generate the TrueFoundry service manifest:

1. Create `.truefoundry/service.yaml` from the project structure
2. Set sensible defaults for replicas (1), CPU (0.5), and memory (512Mi)
3. Confirm the config with the user before deploying

### `deploy.start`

Submit the deployment:

```bash
tfy service deploy --file .truefoundry/service.yaml
```

Stream the deployment logs until the rollout completes or fails.

### `deploy.verify`

Check that the deployed service is healthy:

1. Poll `tfy service status` until the service reaches `RUNNING` state
2. If a health check URL is available, verify it returns HTTP 2xx
3. Report the service URL to the user

## Error handling

If any hook fails:

- Report the error clearly to the user
- Suggest remediation steps
- Do not retry automatically unless the user asks

## Dependencies

- TrueFoundry CLI (`tfy`) — must be installed and on PATH
- `TFY_API_KEY` environment variable or active `tfy login` session
