#####
#
# Generate mkworld binaries
# !needs binfmt:
# docker run --privileged --rm tonistiigi/binfmt --install all
#
# run as:
# docker buildx build --pull --rm --platform linux/amd64,linux/arm64 --target export-stage -o type=local,dest=./build .
######

# BUILD GO UTILS
FROM golang:bullseye AS gobuilder
ARG TARGETPLATFORM
WORKDIR /buildsrc
# COPY argon2g /buildsrc/argon2g
# COPY fileserv /buildsrc/fileserv
COPY . /buildsrc
# COPY build-gobinaries.sh /buildsrc/build-gobinaries.sh
ENV CGO_ENABLED=0
RUN apt update -y && \ 
    apt install zip -y

RUN go build -ldflags='-s -w' -trimpath -o binaries/ztmkworld cmd/mkworld/main.go

FROM scratch AS export-stage
COPY --from=gobuilder /buildsrc/binaries .