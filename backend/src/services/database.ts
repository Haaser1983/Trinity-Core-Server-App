import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pools
const pools = {
  auth: mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'trinity',
    password: process.env.DB_PASS || 'trinity',
    database: process.env.DB_NAME_AUTH || 'auth',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }),
  
  characters: mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'trinity',
    password: process.env.DB_PASS || 'trinity',
    database: process.env.DB_NAME_CHARACTERS || 'characters',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }),
  
  world: mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'trinity',
    password: process.env.DB_PASS || 'trinity',
    database: process.env.DB_NAME_WORLD || 'world',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }),
  
  hotfixes: mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'trinity',
    password: process.env.DB_PASS || 'trinity',
    database: process.env.DB_NAME_HOTFIXES || 'hotfixes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })
};

export type DatabaseName = 'auth' | 'characters' | 'world' | 'hotfixes';

/**
 * Execute a query on a specific database
 */
export async function query<T = any>(
  database: DatabaseName,
  sql: string,
  params?: any[]
): Promise<T> {
  const [rows] = await pools[database].execute(sql, params);
  return rows as T;
}

/**
 * Execute a transaction
 */
export async function transaction<T = any>(
  database: DatabaseName,
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pools[database].getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  try {
    const [authTest] = await pools.auth.execute('SELECT 1 as test');
    const [worldTest] = await pools.world.execute('SELECT COUNT(*) as count FROM item_template');
    
    console.log('✅ Auth database: Connected');
    console.log(`✅ World database: Connected (${(worldTest as any)[0].count} items in database)`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Get connection pool
 */
export function getPool(database: DatabaseName) {
  return pools[database];
}

/**
 * Close all connections
 */
export async function closeAll(): Promise<void> {
  await Promise.all([
    pools.auth.end(),
    pools.characters.end(),
    pools.world.end(),
    pools.hotfixes.end()
  ]);
}

export default pools;
