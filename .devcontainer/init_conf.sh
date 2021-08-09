#!/bin/bash
set -e

psql -h localhost -U postgres -v ON_ERROR_STOP=1 <<-EOSQL
    DROP ROLE IF EXISTS ztnet;
    CREATE ROLE ztnet with INHERIT CREATEROLE CREATEDB LOGIN SUPERUSER PASSWORD 'postgres';

    CREATE DATABASE ztnet;
EOSQL