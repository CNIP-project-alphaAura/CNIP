# Multi-stage Dockerfile for NetTrack Spring Boot Application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the pre-packaged executable Spring Boot JAR
COPY target/nettrack-backend-1.0.0.jar app.jar

# Expose Spring Boot HTTP port
EXPOSE 8080

# Run Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]
