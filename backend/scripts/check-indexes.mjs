import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Rnvk5xQb2XIl@ep-calm-paper-b4s3hhfj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});
const res = await pool.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'health_reports'
  ORDER BY indexname
`);
console.table(res.rows);
await pool.end();