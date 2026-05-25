variable "aws_region" {
  description = "AWS region for the deployment."
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
  default     = "polittalk-watcher"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "prod"
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository."
  type        = string
  default     = "polittalk-crawler"
}

variable "container_image_tag" {
  description = "Container image tag used by the ECS task definition."
  type        = string
  default     = "latest"
}

variable "container_port" {
  description = "Port exposed by the backend container."
  type        = number
  default     = 8080
}

variable "task_cpu" {
  description = "CPU units for the ECS task."
  type        = number
  default     = 2048
}

variable "task_memory" {
  description = "Memory in MiB for the ECS task."
  type        = number
  default     = 4096
}

variable "service_desired_count" {
  description = "Desired number of ECS tasks."
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "Health check path for the load balancer target group."
  type        = string
  default     = "/"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach the load balancer."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "supabase_url_secret_arn" {
  description = "Secrets Manager ARN for SUPABASE_URL."
  type        = string
}

variable "supabase_anon_key_secret_arn" {
  description = "Secrets Manager ARN for SUPABASE_ANON_KEY."
  type        = string
}
