FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests package
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/sportshub-backend-1.0.0.jar app.jar
VOLUME ["/app/data"]
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]