import { Pool } from 'pg';
import { createPool } from '@vercel/postgres';

// 创建数据库连接池
const pool = process.env.VERCEL
  ? createPool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined
    });

// 客服相关操作
export async function getAllCustomerServices() {
  const { rows } = await pool.query(
    'SELECT * FROM customer_service ORDER BY created_at DESC'
  );
  return rows;
}

export async function addCustomerService({ wechatId, name }: { wechatId: string; name: string }) {
  const { rows } = await pool.query(
    'INSERT INTO customer_service (wechat_id, name) VALUES ($1, $2) RETURNING *',
    [wechatId, name]
  );
  return rows[0];
}

export async function deleteCustomerService(id: number) {
  await pool.query('DELETE FROM customer_service WHERE id = $1', [id]);
}

// 家教信息相关操作
export async function getAllTutorRequests() {
  const { rows } = await pool.query(`
    SELECT tr.*, cs.name as cs_name, cs.wechat_id as cs_wechat_id
    FROM tutor_requests tr
    LEFT JOIN customer_service cs ON tr.customer_service_id = cs.id
    ORDER BY tr.is_recommended DESC, tr.created_at DESC
  `);
  return rows;
}

export async function addTutorRequest({
  content,
  city,
  district,
  gradeLevel,
  subjects,
  customerServiceId
}: {
  content: string;
  city?: string;
  district?: string;
  gradeLevel?: string;
  subjects?: string[];
  customerServiceId?: number;
}) {
  const { rows } = await pool.query(
    `INSERT INTO tutor_requests 
     (content, city, district, grade_level, subjects, customer_service_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [content, city, district, gradeLevel, subjects, customerServiceId]
  );
  return rows[0];
}

export async function updateTutorRequest(
  id: number,
  {
    content,
    city,
    district,
    gradeLevel,
    subjects,
    customerServiceId,
    isRecommended
  }: {
    content?: string;
    city?: string;
    district?: string;
    gradeLevel?: string;
    subjects?: string[];
    customerServiceId?: number;
    isRecommended?: boolean;
  }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (content !== undefined) {
    updates.push(`content = $${paramCount}`);
    values.push(content);
    paramCount++;
  }
  if (city !== undefined) {
    updates.push(`city = $${paramCount}`);
    values.push(city);
    paramCount++;
  }
  if (district !== undefined) {
    updates.push(`district = $${paramCount}`);
    values.push(district);
    paramCount++;
  }
  if (gradeLevel !== undefined) {
    updates.push(`grade_level = $${paramCount}`);
    values.push(gradeLevel);
    paramCount++;
  }
  if (subjects !== undefined) {
    updates.push(`subjects = $${paramCount}`);
    values.push(subjects);
    paramCount++;
  }
  if (customerServiceId !== undefined) {
    updates.push(`customer_service_id = $${paramCount}`);
    values.push(customerServiceId);
    paramCount++;
  }
  if (isRecommended !== undefined) {
    updates.push(`is_recommended = $${paramCount}`);
    values.push(isRecommended);
    paramCount++;
  }

  if (updates.length === 0) return null;

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE tutor_requests 
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteTutorRequest(id: number) {
  await pool.query('DELETE FROM tutor_requests WHERE id = $1', [id]);
}

// 搜索和筛选
export async function searchTutorRequests({
  searchText,
  city,
  district,
  gradeLevel,
  subject
}: {
  searchText?: string;
  city?: string;
  district?: string;
  gradeLevel?: string;
  subject?: string;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (searchText) {
    conditions.push(`(
      content ILIKE $${paramCount}
      OR city ILIKE $${paramCount}
      OR district ILIKE $${paramCount}
      OR grade_level ILIKE $${paramCount}
      OR subjects::text ILIKE $${paramCount}
    )`);
    values.push(`%${searchText}%`);
    paramCount++;
  }

  if (city) {
    conditions.push(`city = $${paramCount}`);
    values.push(city);
    paramCount++;
  }

  if (district) {
    conditions.push(`district = $${paramCount}`);
    values.push(district);
    paramCount++;
  }

  if (gradeLevel) {
    conditions.push(`grade_level = $${paramCount}`);
    values.push(gradeLevel);
    paramCount++;
  }

  if (subject) {
    conditions.push(`$${paramCount} = ANY(subjects)`);
    values.push(subject);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT tr.*, cs.name as cs_name, cs.wechat_id as cs_wechat_id
     FROM tutor_requests tr
     LEFT JOIN customer_service cs ON tr.customer_service_id = cs.id
     ${whereClause}
     ORDER BY tr.is_recommended DESC, tr.created_at DESC`,
    values
  );
  return rows;
}

export default pool; 