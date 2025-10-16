import mysql from 'mysql2/promise';
import fs from 'fs';
import { db } from './postgres'; // Import the PostgreSQL database

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
  private connectionConfig: mysql.ConnectionOptions | null = null;
  private userEmail: string;

  constructor(userEmail: string) {
    this.userEmail = userEmail;
  }

  /**
   * Fetch user's MySQL configuration from PostgreSQL database
   */
  private async getUserMySQLConfig(): Promise<mysql.ConnectionOptions> {
    try {
      const result = await db.query(
        'SELECT mysql_config FROM user_mysql_configs WHERE user_id = $1',
        [this.userEmail]
      );

      if (result.rows.length === 0) {
        throw new Error('MySQL configuration not found. Please configure your MySQL database settings first.');
      }

      return result.rows[0].mysql_config as mysql.ConnectionOptions;
    } catch (error) {
      console.error('Error fetching MySQL config:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Fetch user's MySQL configuration from PostgreSQL
      this.connectionConfig = await this.getUserMySQLConfig();

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

  /**
   * Save or update user's MySQL configuration and Google API key in PostgreSQL database
   */
  static async saveUserConfig(userEmail: string, mysqlConfig: mysql.ConnectionOptions, googleApiKey?: string): Promise<void> {
    try {
      // Check if config already exists
      const existingResult = await db.query(
        'SELECT id FROM user_mysql_configs WHERE user_id = $1',
        [userEmail]
      );

      if (existingResult.rows.length > 0) {
        // Update existing config
        const updateFields = ['mysql_config = $1'];
        const params = [JSON.stringify(mysqlConfig)];

        if (googleApiKey !== undefined) {
          updateFields.push('google_api_key = $2');
          params.push(googleApiKey);
        }

        await db.query(
          `UPDATE user_mysql_configs SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = $${params.length + 1}`,
          [...params, userEmail]
        );
      } else {
        // Insert new config
        if (googleApiKey !== undefined) {
          await db.query(
            'INSERT INTO user_mysql_configs (user_id, mysql_config, google_api_key) VALUES ($1, $2, $3)',
            [userEmail, JSON.stringify(mysqlConfig), googleApiKey]
          );
        } else {
          await db.query(
            'INSERT INTO user_mysql_configs (user_id, mysql_config) VALUES ($1, $2)',
            [userEmail, JSON.stringify(mysqlConfig)]
          );
        }
      }
    } catch (error) {
      console.error('Error saving user config:', error);
      throw error;
    }
  }

  /**
   * Get user's MySQL configuration and Google API key (static method for API use)
   */
  static async getUserConfig(userEmail: string): Promise<{ mysqlConfig: mysql.ConnectionOptions | null, googleApiKey: string | null }> {
    try {
      const result = await db.query(
        'SELECT mysql_config, google_api_key FROM user_mysql_configs WHERE user_id = $1',
        [userEmail]
      );

      if (result.rows.length === 0) {
        return { mysqlConfig: null, googleApiKey: null };
      }

      return {
        mysqlConfig: result.rows[0].mysql_config as mysql.ConnectionOptions,
        googleApiKey: result.rows[0].google_api_key || null
      };
    } catch (error) {
      console.error('Error fetching user config:', error);
      throw error;
    }
  }

  /**
   * Get user's MySQL configuration (static method for API use) - backward compatibility
   */
  static async getUserMySQLConfig(userEmail: string): Promise<mysql.ConnectionOptions | null> {
    const { mysqlConfig } = await this.getUserConfig(userEmail);
    return mysqlConfig;
  }

  /**
   * Get user's Google API key (static method for API use)
   */
  static async getUserGoogleApiKey(userEmail: string): Promise<string | null> {
    const { googleApiKey } = await this.getUserConfig(userEmail);
    return googleApiKey;
  }

  /**
   * Get the MySQL connection (for advanced queries)
   */
  getConnection(): mysql.Connection | null {
    return this.connection;
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

  async deleteDocument(documentId: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      // First, delete all statements associated with this document
      await this.deleteStatementsByDocumentId(documentId);

      // Then delete the document itself
      const sql = `DELETE FROM DOCUMENTS WHERE ID = ?`;
      await this.connection.execute(sql, [documentId]);
    } catch (err) {
      throw err;
    }
  }

  async deleteStatementsByDocumentId(documentId: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      // Get all statement IDs for this document
      const [statementRows] = await this.connection.execute(
        'SELECT ID FROM STATEMENTS WHERE DocumentId = ?',
        [documentId]
      );

      const statementIds = (statementRows as any[]).map(row => row.ID);

      if (statementIds.length > 0) {
        // Create placeholders for the IN clause
        const placeholders = statementIds.map(() => '?').join(',');

        // Delete data associated with these statements
        await this.connection.execute(
          `DELETE FROM DATASHORTTEXT WHERE StatementId IN (${placeholders})`,
          statementIds
        );
        await this.connection.execute(
          `DELETE FROM DATABOOLEAN WHERE StatementId IN (${placeholders})`,
          statementIds
        );

        // Delete the statements themselves
        await this.connection.execute(
          'DELETE FROM STATEMENTS WHERE DocumentId = ?',
          [documentId]
        );
      }
    } catch (err) {
      throw err;
    }
  }

  async deleteStatement(statementId: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    try {
      // Delete data associated with this statement from related tables
      await this.connection.execute('DELETE FROM DATASHORTTEXT WHERE StatementId = ?', [statementId]);
      await this.connection.execute('DELETE FROM DATABOOLEAN WHERE StatementId = ?', [statementId]);

      // Delete the statement itself
      await this.connection.execute('DELETE FROM STATEMENTS WHERE ID = ?', [statementId]);
    } catch (err) {
      throw err;
    }
  }

}
