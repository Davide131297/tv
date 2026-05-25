output "ecr_repository_url" {
  description = "URL of the backend ECR repository."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster."
  value       = aws_ecs_cluster.backend.name
}

output "ecs_service_name" {
  description = "Name of the ECS service."
  value       = aws_ecs_service.backend.name
}

output "load_balancer_dns_name" {
  description = "Public DNS name of the load balancer."
  value       = aws_lb.backend.dns_name
}
