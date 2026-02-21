import knexLib from 'knex';

// DB config via env vars
const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'archguard';

const knex = knexLib({
  client: 'mysql2',
  connection: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: 'utf8mb4',
  },
  pool: { min: 0, max: 10 },
});

export default knex;
