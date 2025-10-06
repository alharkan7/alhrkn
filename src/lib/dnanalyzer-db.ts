import mysql from 'mysql2/promise';
import fs from 'fs';

export interface Statement {
  statement: string;
  concept: string;
  actor: string;
  organization: string;
  agree: boolean;
  sourceFile?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface Document {
  id?: number;
  title: string;
  content: string;
  processed?: boolean;
}

// Initial data for DNA Analyzer Database
const INITIAL_DATA_STATEMENTS = [
  `INSERT IGNORE INTO CODERS (ID, Name, Red, Green, Blue, Refresh, FontSize, Password, PopupWidth, ColorByCoder, PopupDecoration, PopupAutoComplete, PermissionAddDocuments, PermissionEditDocuments, PermissionDeleteDocuments, PermissionImportDocuments, PermissionAddStatements, PermissionEditStatements, PermissionDeleteStatements, PermissionEditAttributes, PermissionEditRegex, PermissionEditStatementTypes, PermissionEditCoders, PermissionEditCoderRelations, PermissionViewOthersDocuments, PermissionEditOthersDocuments, PermissionViewOthersStatements, PermissionEditOthersStatements)
   VALUES (1, 'Admin', 255, 0, 0, 0, 14, '', 300, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`,

  `INSERT IGNORE INTO STATEMENTTYPES (ID, Label, Red, Green, Blue) VALUES (1, 'DNA Statement', 239, 208, 51)`,

  `INSERT IGNORE INTO VARIABLES (ID, Variable, DataType, StatementTypeId) VALUES
   (1, 'person', 'short text', 1),
   (2, 'organization', 'short text', 1),
   (3, 'concept', 'short text', 1),
   (4, 'agreement', 'boolean', 1)`
];

export class DNAnalyzerDB {
  private connection: mysql.Connection | null = null;
  private connectionConfig: mysql.ConnectionOptions;

  constructor(connectionConfig?: mysql.ConnectionOptions) {
    this.connectionConfig = connectionConfig || {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'dnanalyzer',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    };
  }

  async initialize(): Promise<void> {
    try {
      this.connection = await mysql.createConnection(this.connectionConfig);

      // Check if tables exist and have data
      const [tables] = await this.connection.execute(`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('CODERS', 'STATEMENTTYPES', 'VARIABLES')
      `, [this.connectionConfig.database]);

      const existingTables = (tables as any[]).map(row => row.TABLE_NAME);

      if (existingTables.length === 0) {
        throw new Error('Required tables not found in database. Please ensure the schema has been created.');
      }

      // Execute initial data (tables should already be created)
      for (const statement of INITIAL_DATA_STATEMENTS) {
        try {
          await this.connection.execute(statement);
        } catch (err: any) {
          // Log but don't fail if data already exists or column names differ
          console.warn('Warning during initialization:', err.message);
        }
      }

    } catch (err) {
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async saveDocument(title: string, content: string): Promise<number> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      const sql = `
        INSERT INTO DOCUMENTS (Title, Text, Coder, Date)
        VALUES (?, ?, 1, ?)
      `;
      const date = Math.floor(Date.now() / 1000); // Unix timestamp

      const [result] = await this.connection.execute(sql, [title, content, date]);
      return (result as any).insertId;
    } catch (err) {
      throw err;
    }
  }

  async updateDocument(documentId: number, title: string, content: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      const sql = `
        UPDATE DOCUMENTS
        SET Title = ?, Text = ?, Date = ?
        WHERE ID = ?
      `;
      const date = Math.floor(Date.now() / 1000); // Unix timestamp

      await this.connection.execute(sql, [title, content, date, documentId]);
    } catch (err) {
      throw err;
    }
  }

  async updateStatement(statementId: number, statement: Statement): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      // Delete existing data for this statement
      await this.connection.execute('DELETE FROM DATASHORTTEXT WHERE StatementId = ?', [statementId]);
      await this.connection.execute('DELETE FROM DATABOOLEAN WHERE StatementId = ?', [statementId]);

      // Re-insert the updated data
      await this.saveEntityAndLink(statementId, 1, statement.actor); // person
      await this.saveEntityAndLink(statementId, 2, statement.organization); // organization
      await this.saveEntityAndLink(statementId, 3, statement.concept); // concept
      await this.saveBooleanData(statementId, 4, statement.agree ? 1 : 0); // agreement
    } catch (err) {
      throw err;
    }
  }

  async saveStatements(documentId: number, statements: Statement[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    if (statements.length === 0) {
      return;
    }

    // Process all statements
    for (const statement of statements) {
      await this.saveSingleStatement(documentId, statement);
    }
  }

  async saveSingleStatement(documentId: number, statement: Statement): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    // Insert statement record
    // Use startIndex and endIndex if available, otherwise fallback to default behavior
    const startPos = statement.startIndex ?? 0;
    const stopPos = statement.endIndex ?? Math.max(1, startPos + statement.statement.length);

    const stmtSql = `
      INSERT INTO STATEMENTS (StatementTypeId, DocumentId, Start, Stop, Coder)
      VALUES (1, ?, ?, ?, 1)
    `;

    const [result] = await this.connection.execute(stmtSql, [documentId, startPos, stopPos]);
    const statementId = (result as any).insertId;

    // Save statement data
    await this.saveEntityAndLink(statementId, 1, statement.actor); // person
    await this.saveEntityAndLink(statementId, 2, statement.organization); // organization
    await this.saveEntityAndLink(statementId, 3, statement.concept); // concept
    await this.saveBooleanData(statementId, 4, statement.agree ? 1 : 0); // agreement
  }

  private async saveEntityAndLink(statementId: number, variableId: number, value: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    if (!value || value.trim() === '') {
      // Skip empty values
      return;
    }

    // First, try to find existing entity with same variable and value
    const findEntitySql = `SELECT ID FROM ENTITIES WHERE VariableId = ? AND Value = ?`;
    const [rows] = await this.connection.execute(findEntitySql, [variableId, value]);
    const row = (rows as any[])[0];

    let entityId: number;

    if (row) {
      entityId = row.ID;
    } else {
      // Create new entity
      const insertEntitySql = `INSERT INTO ENTITIES (VariableId, Value) VALUES (?, ?)`;
      const [result] = await this.connection.execute(insertEntitySql, [variableId, value]);
      entityId = (result as any).insertId;
    }

    // Link entity to statement
    const linkSql = `INSERT INTO DATASHORTTEXT (StatementId, VariableId, Entity) VALUES (?, ?, ?)`;
    await this.connection.execute(linkSql, [statementId, variableId, entityId]);
  }

  private async saveBooleanData(statementId: number, variableId: number, value: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    const sql = `INSERT INTO DATABOOLEAN (StatementId, VariableId, Value) VALUES (?, ?, ?)`;
    await this.connection.execute(sql, [statementId, variableId, value]);
  }

}
