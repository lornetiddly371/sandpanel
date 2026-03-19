FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/sandpanel-backend ./cmd/server

FROM cm2network/steamcmd:root AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends git docker.io docker-compose ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/sandpanel-backend /app/sandpanel-backend
EXPOSE 8080
ENTRYPOINT ["/app/sandpanel-backend"]
