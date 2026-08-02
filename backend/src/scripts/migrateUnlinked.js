import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateUnlinked() {
  const client = await pool.connect();
  try {
    const campusRes = await client.query('SELECT id FROM campuses ORDER BY id LIMIT 1');
    const facultyRes = await client.query('SELECT id FROM faculties ORDER BY id LIMIT 1');
    
    if (campusRes.rows.length === 0 || facultyRes.rows.length === 0) {
      console.log('No campus or faculty exists. Please create them in the admin dashboard first.');
      return;
    }
    
    const defaultCampusId = campusRes.rows[0].id;
    const defaultFacultyId = facultyRes.rows[0].id;
    
    let defaultDeptRes = await client.query('SELECT id FROM departments WHERE faculty_id = $1 ORDER BY id LIMIT 1', [defaultFacultyId]);
    if (defaultDeptRes.rows.length === 0) {
       await client.query('INSERT INTO departments (name, code, faculty_id) VALUES ($1, $2, $3)', ['General Department', 'GEN', defaultFacultyId]);
       defaultDeptRes = await client.query('SELECT id FROM departments WHERE faculty_id = $1 ORDER BY id LIMIT 1', [defaultFacultyId]);
    }
    const defaultDeptId = defaultDeptRes.rows[0].id;

    const unassignedProgs = await client.query('SELECT id FROM programmes WHERE department_id IS NULL');
    if (unassignedProgs.rows.length > 0) {
      console.log(`Found ${unassignedProgs.rows.length} unassigned programmes. Assigning to default department ${defaultDeptId}...`);
      await client.query('UPDATE programmes SET department_id = $1 WHERE department_id IS NULL', [defaultDeptId]);
    } else {
      console.log('All programmes have a department assigned.');
    }

    const progsWithoutCampus = await client.query('SELECT id FROM programmes p WHERE NOT EXISTS (SELECT 1 FROM campus_programmes cp WHERE cp.programme_id = p.id)');
    if (progsWithoutCampus.rows.length > 0) {
      console.log(`Found ${progsWithoutCampus.rows.length} programmes without a campus. Assigning to default campus ${defaultCampusId}...`);
      for (const row of progsWithoutCampus.rows) {
         await client.query('INSERT INTO campus_programmes (campus_id, programme_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [defaultCampusId, row.id]);
      }
    } else {
      console.log('All programmes have at least one campus assigned.');
    }
    console.log('Migration of old programmes complete.');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
migrateUnlinked();
