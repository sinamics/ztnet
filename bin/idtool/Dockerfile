# syntax=docker/dockerfile:1

# Build stage
FROM --platform=$TARGETPLATFORM ubuntu:20.04 AS builder

ARG TARGETPLATFORM
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  curl \
  gnupg \
  lsb-release \
  && rm -rf /var/lib/apt/lists/*

# Add ZeroTier repository and install
RUN curl -s 'https://raw.githubusercontent.com/zerotier/ZeroTierOne/master/doc/contact%40zerotier.com.gpg' | gpg --dearmor > /usr/share/keyrings/zerotier-archive-keyring.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/zerotier-archive-keyring.gpg] http://download.zerotier.com/debian/$(lsb_release -cs) $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/zerotier.list

RUN apt-get update && apt-get install -y zerotier-one

# Final stage
FROM scratch AS export-stage

# Copy zerotier-idtool from the builder stage
COPY --from=builder /usr/sbin/zerotier-idtool .

# Build command:
# docker buildx build --platform linux/amd64,linux/arm64 --target export-stage -o type=local,dest=./build .