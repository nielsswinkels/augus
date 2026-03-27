FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy the Linux PocketBase binary (download separately — see README)
COPY pocketbase ./pocketbase
RUN chmod +x ./pocketbase

COPY pb_migrations ./pb_migrations
COPY pb_public ./pb_public

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
