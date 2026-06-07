FROM alpine:3.21

ARG PB_VERSION=0.25.9

RUN apk add --no-cache ca-certificates wget unzip

WORKDIR /app

# Download PocketBase automatically
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
    && unzip /tmp/pb.zip pocketbase -d /app \
    && rm /tmp/pb.zip \
    && chmod +x /app/pocketbase

COPY pb_migrations ./pb_migrations
COPY pb_public ./pb_public

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
