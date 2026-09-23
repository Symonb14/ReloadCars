-- Banco separado para os testes automatizados (npm test).
CREATE DATABASE reloadcars_test;
\connect reloadcars_test
CREATE EXTENSION IF NOT EXISTS postgis;
