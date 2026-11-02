# Stage 1: Build the Spring Boot application using Maven
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create lightweight production runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/nettrack-backend-1.0.0.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
