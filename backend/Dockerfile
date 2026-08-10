FROM golang:1.25-alpine AS build

WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/upkeeper ./main.go

FROM alpine:3.22

WORKDIR /app
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/upkeeper /app/upkeeper
ENV DB_PATH=/data/upkeeper.db
EXPOSE 8111
VOLUME ["/data"]
ENTRYPOINT ["/app/upkeeper"]
