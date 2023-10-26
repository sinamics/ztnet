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
COPY . /buildsrc

ENV CGO_ENABLED=0
RUN apt update -y && \ 
    apt install zip -y

RUN go build -ldflags='-s -w' -trimpath -o binaries/ztmkworld cmd/mkworld/main.go
# RUN GOOS=freebsd GOARCH=amd64 go build -ldflags='-s -w' -trimpath -o binaries/ztmkworld cmd/mkworld/main.go

FROM scratch AS export-stage
COPY --from=gobuilder /buildsrc/binaries .