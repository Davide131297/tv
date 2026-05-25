# AWS Deployment

Diese Datei beschreibt das neue Backend-Deployment fuer `backend/` auf AWS. Der bisherige Cloud-Run-Workflow wird durch `ECR + ECS Fargate + Application Load Balancer + Terraform` ersetzt.

## Zielbild

- Docker-Image aus `backend/`
- Push nach Amazon ECR
- Infrastruktur via Terraform in `terraform/aws/`
- Ausfuehrung auf ECS Fargate
- Logging in CloudWatch
- Secrets aus AWS Secrets Manager
- Deployment ueber GitHub Actions per OIDC-Rolle

## Was der GitHub-Workflow jetzt macht

Die Datei [.github/workflows/deploy-cloud-run.yml](/Users/davidechiffi/tv/.github/workflows/deploy-cloud-run.yml) deployt jetzt nach AWS:

1. GitHub Actions authentifiziert sich per OIDC gegen AWS.
2. Terraform erstellt oder aktualisiert VPC, ALB, ECR, ECS, IAM und CloudWatch.
3. Das Backend-Image wird gebaut und nach ECR gepusht.
4. ECS bekommt ein `force-new-deployment`, damit das neue `latest`-Image gezogen wird.

## Terraform-Struktur

Die AWS-Infrastruktur liegt unter [terraform/aws](/Users/davidechiffi/tv/terraform/aws).

- `versions.tf`: Terraform-/Provider-Versionen und S3-Backend-Definition
- `variables.tf`: konfigurierbare Parameter
- `main.tf`: Netzwerk, Security Groups, ECR, ECS, ALB, IAM
- `outputs.tf`: wichtige Outputs fuer CI und manuelle Nutzung

## Manuelle AWS-Einrichtung

Diese Dinge musst du einmalig selbst in AWS einrichten:

### 1. OIDC fuer GitHub Actions

In AWS IAM:

- einen OIDC Identity Provider fuer `https://token.actions.githubusercontent.com` anlegen
- eine IAM-Rolle fuer GitHub Actions anlegen
- dieser Rolle mindestens folgende Rechte geben:
  - ECR verwalten/pushen
  - ECS Service updaten
  - CloudWatch Logs lesen/schreiben
  - IAM-Rollen/Policies erstellen, falls Terraform das komplett verwalten soll
  - VPC, ALB, ECS, ECR, CloudWatch, IAM via Terraform erstellen/aendern
  - S3/DynamoDB fuer Terraform State nutzen

Empfehlung:

- Trust Policy auf dein Repo und Branch `main` beschraenken
- nicht breit auf alle GitHub-Repositories freigeben

### 2. Terraform Remote State

Fuer produktive Nutzung solltest du Remote State nutzen.

Lege an:

- einen S3-Bucket fuer Terraform State
- eine DynamoDB-Tabelle fuer State Locking

Der Workflow nutzt diese beiden Werte, wenn du die passenden GitHub-Secrets setzt. Ohne diese Secrets laeuft `terraform init -backend=false` und verwendet lokales State-Verhalten im CI. Das ist nur fuer Tests sinnvoll, nicht fuer echte Deployments.

### 3. Secrets Manager

Lege in AWS Secrets Manager mindestens diese zwei Secrets an:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Wichtig:

- im Workflow werden die kompletten Secret-ARNs erwartet
- die ECS Task Execution Role bekommt Leserechte genau auf diese beiden ARNs

### 4. Optional: DNS und HTTPS

Aktuell erstellt Terraform einen oeffentlichen HTTP-Load-Balancer auf Port `80`.

Fuer Produktion solltest du zusaetzlich selbst einrichten:

- ACM-Zertifikat
- HTTPS-Listener auf dem ALB
- optional Route53 Record auf den ALB
- optional restriktivere `allowed_cidr_blocks`

### 5. Netzwerk-/Zugriffsentscheidung

Der aktuelle Stand ist bewusst einfach:

- ALB ist oeffentlich
- Zugriff standardmaessig von `0.0.0.0/0`

Wenn der Crawler nicht oeffentlich erreichbar sein soll, musst du selbst entscheiden, was du willst:

- CIDR auf feste IPs einschraenken
- ALB intern machen
- Zugriff nur ueber VPN/Bastion/VPC peering
- zusaetzlich Authentifizierung vor den Service setzen

## GitHub-Variablen und Secrets

Diese Werte musst du im GitHub-Repository setzen.

### Repository Variables

- `AWS_REGION`
- `AWS_PROJECT_NAME`
- `AWS_ENVIRONMENT`
- `ECR_REPOSITORY_NAME`
- `AWS_CONTAINER_PORT`
- `AWS_SERVICE_DESIRED_COUNT`
- `AWS_TASK_CPU`
- `AWS_TASK_MEMORY`

Empfohlene Startwerte:

```text
AWS_REGION=eu-central-1
AWS_PROJECT_NAME=polittalk-watcher
AWS_ENVIRONMENT=prod
ECR_REPOSITORY_NAME=polittalk-crawler
AWS_CONTAINER_PORT=8080
AWS_SERVICE_DESIRED_COUNT=1
AWS_TASK_CPU=2048
AWS_TASK_MEMORY=4096
```

### Repository Secrets

- `AWS_GITHUB_ACTIONS_ROLE_ARN`
- `AWS_SUPABASE_URL_SECRET_ARN`
- `AWS_SUPABASE_ANON_KEY_SECRET_ARN`
- `AWS_TERRAFORM_STATE_BUCKET`
- `AWS_TERRAFORM_LOCK_TABLE`

## Lokale Terraform-Nutzung

Beispiel:

```bash
cd terraform/aws
terraform init \
  -backend-config="bucket=<dein-state-bucket>" \
  -backend-config="key=polittalk-watcher/aws-prod.tfstate" \
  -backend-config="region=eu-central-1" \
  -backend-config="dynamodb_table=<deine-lock-tabelle>"

terraform apply \
  -var="aws_region=eu-central-1" \
  -var="project_name=polittalk-watcher" \
  -var="environment=prod" \
  -var="supabase_url_secret_arn=<arn:...>" \
  -var="supabase_anon_key_secret_arn=<arn:...>"
```

Danach bekommst du u. a. diesen Output:

- `ecr_repository_url`
- `ecs_cluster_name`
- `ecs_service_name`
- `load_balancer_dns_name`

## Wichtige technische Hinweise

### 1. Image-Tagging

Terraform referenziert standardmaessig das Image-Tag `latest`.

Der Workflow pusht:

- `${GITHUB_SHA}`
- `latest`

Danach wird ECS per `force-new-deployment` neu gestartet, damit das neue `latest` gezogen wird.

### 2. Laufzeitparameter

Der Cloud-Run-Stand war:

- `cpu=2`
- `memory=2Gi`
- `timeout=3600`
- `max-instances=1`

Auf AWS ist jetzt initial hinterlegt:

- `task_cpu=2048`
- `task_memory=4096`
- `desired_count=1`

Das kannst du ueber GitHub Variables oder Terraform-Variablen anpassen.

Wichtig:

- ECS/Fargate kennt kein direktes Cloud-Run-Pendant fuer `max-instances=1`
- mit `desired_count=1` laeuft genau eine Task
- Deployment-Rollouts koennen waehrend Updates kurzzeitig eine zweite Task starten

### 3. Weitere App-Secrets

Aktuell werden nur diese beiden Laufzeit-Secrets nach ECS injiziert:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Falls dein Backend spaeter weitere Pflicht-Umgebungsvariablen braucht, musst du beides erweitern:

1. Secret in AWS anlegen
2. ARN im Workflow bzw. als Terraform-Variable verfuegbar machen
3. `terraform/aws/main.tf` in `container_definitions.secrets` erweitern

## Was du nach dem Merge testen solltest

1. GitHub Actions Run auf `main` beobachten
2. pruefen, ob Terraform ohne Drift durchlaeuft
3. pruefen, ob das Image in ECR liegt
4. pruefen, ob ECS Task healthy wird
5. `http://<load_balancer_dns_name>/` aufrufen
6. einen echten Crawl-Endpunkt gegen die neue AWS-Instanz testen
7. CloudWatch Logs auf Chromium-/Puppeteer-Probleme pruefen

## Bekannte offene Punkte

- noch kein HTTPS/ACM/Route53
- noch keine zusaetzliche Authentifizierung vor dem Backend
- noch keine Private-Subnet-/NAT-Topologie
- aktuell nur die zwei Supabase-Secrets verdrahtet
- Workflow-Dateiname heisst noch `deploy-cloud-run.yml`, obwohl der Inhalt jetzt AWS ist
