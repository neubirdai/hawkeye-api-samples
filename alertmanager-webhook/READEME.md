## Hawkeye Alertmanager Webhook

A **FastAPI-based webhook receiver** for Prometheus Alertmanager that listens for alerts and integrates them into **Hawkeye** using Hawkeye APIs.

**Core functionality**:  
When an alert is received, it creates a **automated session in the configured Hawkeye project** using the `alertname` and `description` from the alert.

---

### Features

- Receives Prometheus alerts via webhook
- Creates sessions in Hawkeye projects
- Simple FastAPI app — containerized and ready to deploy
- Helm chart for easy installation
  
---

## Prerequisites

- Kubernetes cluster (v1.22+)
- Prometheus + Alertmanager Installed
- Hawkeye Instance
- Docker registry (DockerHub, GHCR, ECR, etc.)

---

## Build and Push Docker Image

### Step 1: Build

```bash
docker build -t <your-registry>/hawkeye-alertmanager-webhook:latest .
```

### Step 2: Push

```bash
docker push <your-registry>/hawkeye-alertmanager-webhook:latest
```

---

## Deploy to Kubernetes

### Step 3: Update Helm image values

```yaml
image:
  repository: <your-registry>/hawkeye-alertmanager-webhook
  tag: latest
```

### Step 4: Install with Helm

```bash
helm install hawkeye-webhook ./chart \
  --set image.repository=<your-registry>/hawkeye-alertmanager-webhook \
  --set image.tag=latest \
  --set hawkeye.user="your-user" \
  --set hawkeye.password="your-password" \
  --set hawkeye.url="https://hawkeye.example.com" \
  --set hawkeye.project="MyProject"
```

---

## Optional: AlertmanagerConfig CRD

The Helm chart supports auto-creation of an `AlertmanagerConfig` to route alerts to this webhook:

```yaml
alertmanagerconfig:
  create: true
```

Or via CLI:

```bash
--set alertmanagerconfig.create=true \
```

---

## If You Don't Want to Use the CRD

You can update your Alertmanager configuration manually (e.g., `alertmanager.yaml` or the `alertmanager` config in `kube-prometheus-stack`):

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: hawkeye-webhook
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h

receivers:
  - name: 'hawkeye-webhook'
    webhook_configs:
      - url: 'http://hawkeye-alerts-webook.<namespace>.svc.cluster.local/alert'
        send_resolved: true
```

> Replace `<namespace>` with the namespace you deployed the Helm release to.

---

## Helm Configuration

| Key                    | Description                           | Required |
|------------------------|---------------------------------------|----------|
| `image.repository`     | Docker image repo                     | Yes      |
| `image.tag`            | Docker image tag                      | Yes      |
| `hawkeye.user`         | Hawkeye user                          | Yes      |
| `hawkeye.password`     | Hawkeye password                      | Yes      |
| `hawkeye.url`          | Hawkeye base URL                      | Yes      |
| `hawkeye.project`      | Hawkeye project name                  | Yes      |
| `alertmanagerconfig.create` | Whether to create AMConfig CRD   | No       |

---

## Local Development

```bash
export HAWKEYE_USER=your-user
export HAWKEYE_PASSWORD=your-password
export HAWKEYE_URL=https://hawkeye.example.com
export HAWKEYE_PROJECT=MyProject

uvicorn src.main:app --reload --port 8000
```

---

## Webhook Endpoint

- **URL**: `/alert`
- **Method**: `POST`
- **Payload**: [Prometheus Alertmanager webhook format](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)

---

## Project Structure

```
hawkeye-alertmanager-webhook/
├── chart/                      # Helm chart
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── alertmanagerconfig.yaml
├── src/                        # FastAPI app
│   ├── main.py                 # Webhook route
│   └── hawkeye.py              # Alert handler logic
├── Dockerfile
└── requirements.txt
```