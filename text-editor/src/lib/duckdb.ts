import * as duckdb from '@duckdb/duckdb-wasm';

let duckDBInstance: duckdb.AsyncDuckDB | null = null;
let duckDBConnection: duckdb.AsyncDuckDBConnection | null = null;

// Singleton pattern for DuckDB
export const initDuckDB = async (): Promise<duckdb.AsyncDuckDBConnection> => {
  if (duckDBConnection) {
    return duckDBConnection;
  }

  try {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
    );
    
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    
    duckDBInstance = new duckdb.AsyncDuckDB(logger, worker);
    await duckDBInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    
    duckDBConnection = await duckDBInstance.connect();
    
    // Enable JSON extension
    await duckDBConnection.query(`INSTALL json;`);
    await duckDBConnection.query(`LOAD json;`);
    
    return duckDBConnection;
  } catch (error) {
    console.error('Failed to initialize DuckDB:', error);
    throw error;
  }
};

// Get file extension
const getFileExtension = (filePath: string): string => {
  return filePath.split('.').pop()?.toLowerCase() || '';
};

// Create a temp table from file content
export const createTempTable = async (
  conn: duckdb.AsyncDuckDBConnection,
  filePath: string,
  content: string
): Promise<string> => {
  const extension = getFileExtension(filePath);
  const tableName = `data_${Date.now()}`;
  
  try {
    switch (extension) {
      case 'csv':
      case 'tsv':
        // For CSV/TSV, we need to write to a temp file and read from there
        // Since we're in browser, we'll parse it differently
        await conn.query(`
          CREATE TEMP TABLE ${tableName} AS 
          SELECT * FROM read_csv_auto('data:text/csv;base64,${btoa(content)}')
        `);
        break;
        
      case 'json':
      case 'jsonl':
        // Parse JSON and create table
        try {
          const jsonData = JSON.parse(content);
          
          if (Array.isArray(jsonData)) {
            // Array of objects - create table from array
            if (jsonData.length > 0) {
              const columns = Object.keys(jsonData[0]).map(key => 
                `"${key}" VARCHAR`
              ).join(', ');
              
              await conn.query(`CREATE TEMP TABLE ${tableName} (${columns})`);
              
              // Insert data
              for (const row of jsonData.slice(0, 10000)) { // Limit to 10k rows for performance
                const keys = Object.keys(row).map(k => `"${k}"`).join(', ');
                const values = Object.values(row).map(v => 
                  typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : 
                  v === null ? 'NULL' : String(v)
                ).join(', ');
                
                await conn.query(`INSERT INTO ${tableName} (${keys}) VALUES (${values})`);
              }
            }
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            // Single object - create a single-row table
            const columns = Object.keys(jsonData).map(key => 
              `"${key}" VARCHAR`
            ).join(', ');
            
            await conn.query(`CREATE TEMP TABLE ${tableName} (${columns})`);
            
            const keys = Object.keys(jsonData).map(k => `"${k}"`).join(', ');
            const values = Object.values(jsonData).map(v => 
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : 
              v === null ? 'NULL' : String(v)
            ).join(', ');
            
            await conn.query(`INSERT INTO ${tableName} (${keys}) VALUES (${values})`);
          }
        } catch (e) {
          // If JSON parsing fails, treat as text
          await conn.query(`CREATE TEMP TABLE ${tableName} (content VARCHAR)`);
          await conn.query(`INSERT INTO ${tableName} VALUES ('${content.replace(/'/g, "''")}')`);
        }
        break;
        
      case 'parquet':
        // For parquet files, we need special handling
        await conn.query(`
          CREATE TEMP TABLE ${tableName} AS 
          SELECT * FROM parquet_scan('data:application/octet-stream;base64,${btoa(content)}')
        `);
        break;
        
      default:
        // Default to text table
        await conn.query(`CREATE TEMP TABLE ${tableName} (content VARCHAR)`);
        const lines = content.split('\n');
        for (const line of lines.slice(0, 10000)) {
          await conn.query(`INSERT INTO ${tableName} VALUES ('${line.replace(/'/g, "''")}')`);
        }
    }
    
    return tableName;
  } catch (error) {
    console.error('Error creating temp table:', error);
    // Fallback to simple text table
    await conn.query(`CREATE TEMP TABLE ${tableName} (content VARCHAR)`);
    const lines = content.split('\n').slice(0, 1000);
    for (const line of lines) {
      await conn.query(`INSERT INTO ${tableName} VALUES ('${line.replace(/'/g, "''")}')`);
    }
    return tableName;
  }
};

// Execute a SQL query
export const executeSQL = async (
  query: string,
  filePath: string,
  content: string
): Promise<{ success: boolean; data?: any[]; columns?: string[]; error?: string; executionTime: number }> => {
  const startTime = performance.now();
  
  try {
    const conn = await initDuckDB();
    const tableName = await createTempTable(conn, filePath, content);
    
    // Replace 'data' or 'filename' in query with actual table name
    let processedQuery = query
      .replace(/FROM\s+['"]data\.\w+['"]/gi, `FROM ${tableName}`)
      .replace(/FROM\s+['"][^'"]+\.\w+['"]/gi, `FROM ${tableName}`)
      .replace(/FROM\s+data/gi, `FROM ${tableName}`)
      .replace(/DESCRIBE\s+['"][^'"]+['"]/gi, `DESCRIBE ${tableName}`);
    
    // If query doesn't have FROM clause, assume SELECT * FROM table
    if (!processedQuery.toLowerCase().includes('from')) {
      processedQuery = `SELECT * FROM ${tableName}`;
    }
    
    const result = await conn.query(processedQuery);
    const rows = result.toArray();
    const columns = result.schema.fields.map(f => f.name);
    
    // Clean up temp table
    await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
    
    const executionTime = performance.now() - startTime;
    
    return {
      success: true,
      data: rows.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
          obj[col] = row[col];
        });
        return obj;
      }),
      columns,
      executionTime
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime
    };
  }
};

// Get default query based on file type
export const getDefaultSQLQuery = (filePath: string): string => {
  const extension = getFileExtension(filePath);
  
  switch (extension) {
    case 'csv':
    case 'tsv':
      return `-- Query CSV data
SELECT * FROM 'data.csv' LIMIT 100;

-- Count rows
-- SELECT COUNT(*) FROM 'data.csv';

-- Describe schema
-- DESCRIBE 'data.csv';`;
      
    case 'json':
    case 'jsonl':
      return `-- Query JSON data
SELECT * FROM 'data.json';

-- Get specific fields
-- SELECT key, value FROM 'data.json';`;
      
    case 'parquet':
      return `-- Query Parquet data
SELECT * FROM 'data.parquet' LIMIT 100;

-- Describe schema
-- DESCRIBE 'data.parquet';`;
      
    default:
      return `-- Write your SQL query here
SELECT * FROM data;`;
  }
};

// Export results to CSV
export const exportToCSV = (data: any[], columns: string[]): string => {
  if (!data.length) return '';
  
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  return [header, ...rows].join('\n');
};

// Export results to JSON
export const exportToJSON = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};