docker buildx build --platform linux/amd64,linux/arm64 \
-t kasbench/globeco-portfolio-management-portal:latest \
-t kasbench/globeco-portfolio-management-portal:1.0.0 \
--push .
kubectl rollout restart deployment/globeco-portfolio-management-portal
