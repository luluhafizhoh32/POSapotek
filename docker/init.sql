CREATE ROLE pos_migrator LOGIN PASSWORD 'ganti_di_env' CREATEDB;
CREATE ROLE pos_app LOGIN PASSWORD 'ganti_di_env' NOBYPASSRLS;
CREATE DATABASE pos_apotek OWNER pos_migrator;
CREATE DATABASE pos_apotek_test OWNER pos_migrator;
