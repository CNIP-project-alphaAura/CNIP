# Stage 1: Build the Spring Boot application using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create production runtime image with NS-2 and gawk
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install native NS-2 simulator, AWK, and TCL for Linux environment
RUN apt-get update && \
    apt-get install -y --no-install-recommends ns2 gawk tcl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/nettrack-backend-1.0.0.jar app.jar
COPY ns2_simulations ./ns2_simulations
COPY awk_scripts ./awk_scripts
RUN mkdir -p outputs/traces outputs/metrics outputs/algorithm_data outputs/graphs

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
