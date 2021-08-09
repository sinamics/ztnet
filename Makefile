ifneq (,$(wildcard ./.env))
	include .env
	export
	ENV_FILE_PARAM = --env-file .env
endif

#Prod
build-prod:
	docker-compose -f docker-compose-prod.yml up -d --build

up-prod:
	docker-compose -f docker-compose-prod.yml up -d

down-prod:
	docker-compose -f docker-compose-prod.yml down

#dev
build-dev:
	docker-compose -f docker-compose-dev.yml up -d --build

up-dev:
	docker-compose -f docker-compose-dev.yml up -d

down-dev:
	docker-compose -f docker-compose-dev.yml down




# 	# This is a basic workflow to help you get started with Actions

# name: DIGITAL OCEAN ZTNET

# # Controls when the workflow will run
# on:
#   # Triggers the workflow on push or pull request events but only for the main branch
#   push:
#     branches: [ main ]

#   # Allows you to run this workflow manually from the Actions tab
#   workflow_dispatch:

# # A workflow run is made up of one or more jobs that can run sequentially or in parallel
# jobs:
#   # This workflow contains a single job called "build"
#   build:
#     # The type of runner that the job will run on
#     runs-on: self-hosted

#     # Steps represent a sequence of tasks that will be executed as part of the job
#     steps:
#       # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
#       - uses: actions/checkout@main
#       - name: Create .env
#         run: 
#             SITE_NAME: "uavnet"
# 			POSTGRES_USER: "ztne"
# 			SERVER_PORT: "4000"
# 			ACCESS_TOKEN_SECRET: "}5wvIh'zFksAUSeZ2(vd}Lc0wG|Kc*"
# 			REFRESH_TOKEN_SECRET: "HZffv1GyzNo,+p@'uu@-tP-hDq~zxe"
# 			ACCESS_TOKEN_LIFE: "5s"
# 			JWT_CLOCKDIFFRENCE_ALLOWED: "5"
# 			POSTGRES_USER: "ztnet"
# 			POSTGRES_PASSWORD: "[wU6u4.PYq+3kq--"
# 			POSTGRES_HOST: "postgres"
# 			POSTGRES_PORT: "5432"
# 			POSTGRES_DB: "ztnet"
# 	  		CONNECTION_STRING: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
#       - name: Run Build
#         run: docker-compose -f docker-compose-prod.yml up -d --build