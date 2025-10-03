import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Statement {
  statement: string;
  concept: string;
  actor: string;
  organization: string;
  agree: boolean;
  sourceFile?: string;
}

export interface Document {
  id?: number;
  title: string;
  content: string;
  processed?: boolean;
}

// DNA Analyzer Database Schema based on the .dna file structure
const SCHEMA_SQL = `
-- Core tables
CREATE TABLE IF NOT EXISTS CODERS (
    ID INTEGER NOT NULL PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE CHECK (LENGTH(Name) < 191),
    Password TEXT NOT NULL CHECK (LENGTH(Password) < 191),
    Description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS STATEMENTTYPES (
    ID INTEGER NOT NULL PRIMARY KEY,
    Type TEXT NOT NULL UNIQUE CHECK (LENGTH(Type) < 191),
    Red INTEGER NOT NULL CHECK (Red >= 0 AND Red <= 255),
    Green INTEGER NOT NULL CHECK (Green >= 0 AND Green <= 255),
    Blue INTEGER NOT NULL CHECK (Blue >= 0 AND Blue <= 255)
);

CREATE TABLE IF NOT EXISTS VARIABLES (
    ID INTEGER NOT NULL PRIMARY KEY,
    Variable TEXT NOT NULL CHECK (LENGTH(Variable) < 191),
    DataType TEXT NOT NULL CHECK (DataType IN ('boolean', 'integer', 'long text', 'short text')) DEFAULT 'short text',
    StatementTypeId INTEGER,
    FOREIGN KEY(StatementTypeId) REFERENCES STATEMENTTYPES(ID) ON DELETE CASCADE,
    UNIQUE (Variable, StatementTypeId)
);

CREATE TABLE IF NOT EXISTS ENTITIES (
    ID INTEGER NOT NULL PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE CHECK (LENGTH(Name) < 191),
    Type INTEGER NOT NULL DEFAULT 0,
    Red INTEGER NOT NULL DEFAULT 0 CHECK (Red >= 0 AND Red <= 255),
    Green INTEGER NOT NULL DEFAULT 0 CHECK (Green >= 0 AND Green <= 255),
    Blue INTEGER NOT NULL DEFAULT 0 CHECK (Blue >= 0 AND Blue <= 255),
    Notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS DOCUMENTS (
    ID INTEGER NOT NULL PRIMARY KEY,
    Title TEXT NOT NULL CHECK (LENGTH(Title) < 191),
    Text TEXT NOT NULL,
    Coder INTEGER,
    Author TEXT NOT NULL DEFAULT '' CHECK (LENGTH(Author) < 191),
    Source TEXT NOT NULL DEFAULT '' CHECK (LENGTH(Source) < 191),
    Section TEXT NOT NULL DEFAULT '' CHECK (LENGTH(Section) < 191),
    Notes TEXT NOT NULL DEFAULT '',
    Type TEXT NOT NULL DEFAULT '' CHECK (LENGTH(Type) < 191),
    Date INTEGER NOT NULL,
    FOREIGN KEY(Coder) REFERENCES CODERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS STATEMENTS (
    ID INTEGER NOT NULL PRIMARY KEY,
    StatementTypeId INTEGER,
    DocumentId INTEGER,
    Start INTEGER NOT NULL CHECK(Start >= 0),
    Stop INTEGER NOT NULL CHECK(Stop >= 0),
    Coder INTEGER,
    CHECK (Start < Stop),
    FOREIGN KEY(StatementTypeId) REFERENCES STATEMENTTYPES(ID) ON DELETE CASCADE,
    FOREIGN KEY(Coder) REFERENCES CODERS(ID) ON DELETE CASCADE,
    FOREIGN KEY(DocumentId) REFERENCES DOCUMENTS(ID) ON DELETE CASCADE
);

-- Data storage tables
CREATE TABLE IF NOT EXISTS DATASHORTTEXT (
    ID INTEGER PRIMARY KEY NOT NULL,
    StatementId INTEGER NOT NULL,
    VariableId INTEGER NOT NULL,
    Entity INTEGER NOT NULL,
    FOREIGN KEY(StatementId) REFERENCES STATEMENTS(ID) ON DELETE CASCADE,
    FOREIGN KEY(VariableId) REFERENCES VARIABLES(ID) ON DELETE CASCADE,
    FOREIGN KEY(Entity) REFERENCES ENTITIES(ID) ON DELETE CASCADE,
    UNIQUE (StatementId, VariableId)
);

CREATE TABLE IF NOT EXISTS DATABOOLEAN (
    ID INTEGER PRIMARY KEY NOT NULL,
    StatementId INTEGER NOT NULL,
    VariableId INTEGER NOT NULL,
    Value INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(StatementId) REFERENCES STATEMENTS(ID) ON DELETE CASCADE,
    FOREIGN KEY(VariableId) REFERENCES VARIABLES(ID) ON DELETE CASCADE,
    UNIQUE (StatementId, VariableId)
);

CREATE TABLE IF NOT EXISTS DATAINTEGER (
    ID INTEGER PRIMARY KEY NOT NULL,
    StatementId INTEGER NOT NULL,
    VariableId INTEGER NOT NULL,
    Value INTEGER NOT NULL,
    FOREIGN KEY(StatementId) REFERENCES STATEMENTS(ID) ON DELETE CASCADE,
    FOREIGN KEY(VariableId) REFERENCES VARIABLES(ID) ON DELETE CASCADE,
    UNIQUE (StatementId, VariableId)
);

CREATE TABLE IF NOT EXISTS DATALONGTEXT (
    ID INTEGER PRIMARY KEY NOT NULL,
    StatementId INTEGER NOT NULL,
    VariableId INTEGER NOT NULL,
    Value TEXT NOT NULL,
    FOREIGN KEY(StatementId) REFERENCES STATEMENTS(ID) ON DELETE CASCADE,
    FOREIGN KEY(VariableId) REFERENCES VARIABLES(ID) ON DELETE CASCADE,
    UNIQUE (StatementId, VariableId)
);

-- Other supporting tables
CREATE TABLE IF NOT EXISTS ATTRIBUTEVARIABLES (
    ID INTEGER NOT NULL PRIMARY KEY,
    Variable TEXT NOT NULL UNIQUE CHECK (LENGTH(Variable) < 191),
    DataType TEXT NOT NULL CHECK (DataType IN ('boolean', 'integer', 'long text', 'short text')) DEFAULT 'short text'
);

CREATE TABLE IF NOT EXISTS ATTRIBUTEVALUES (
    ID INTEGER PRIMARY KEY NOT NULL,
    EntityId INTEGER NOT NULL,
    AttributeVariableId INTEGER NOT NULL,
    AttributeValue TEXT NOT NULL DEFAULT '' CHECK (LENGTH(AttributeValue) < 191),
    UNIQUE (EntityId, AttributeVariableId),
    FOREIGN KEY(EntityId) REFERENCES ENTITIES(ID) ON DELETE CASCADE,
    FOREIGN KEY(AttributeVariableId) REFERENCES ATTRIBUTEVARIABLES(ID) ON DELETE CASCADE
);

-- Other tables (placeholders for compatibility)
CREATE TABLE IF NOT EXISTS CODERRELATIONS (ID INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS REGEXES (ID INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS SETTINGS (ID INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS VARIABLELINKS (ID INTEGER PRIMARY KEY);
`;

const INITIAL_DATA_SQL = `
-- Insert default coder
INSERT OR IGNORE INTO CODERS (ID, Name, Password, Description) VALUES (1, 'Default User', '', 'Default user for DNA Analyzer');

-- Insert DNA Statement type
INSERT OR IGNORE INTO STATEMENTTYPES (ID, Type, Red, Green, Blue) VALUES (1, 'DNA Statement', 239, 208, 51);

-- Insert required variables for DNA Statement type
INSERT OR IGNORE INTO VARIABLES (ID, Variable, DataType, StatementTypeId) VALUES
(1, 'person', 'short text', 1),
(2, 'organization', 'short text', 1),
(3, 'concept', 'short text', 1),
(4, 'agreement', 'boolean', 1);
`;

export class DNAnalyzerDB {
  private db: InstanceType<typeof Database> | null = null;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.db = new Database(this.dbPath);

        // Execute schema creation
        this.db.exec(SCHEMA_SQL);

        // Execute initial data
        this.db.exec(INITIAL_DATA_SQL);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      resolve();
    });
  }

  async saveDocument(title: string, content: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const sql = `
          INSERT INTO DOCUMENTS (Title, Text, Date)
          VALUES (?, ?, ?)
        `;
        const date = Math.floor(Date.now() / 1000); // Unix timestamp

        const stmt = this.db.prepare(sql);
        const result = stmt.run(title, content, date);
        resolve(result.lastInsertRowid as number);
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveStatements(documentId: number, statements: Statement[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (statements.length === 0) {
        resolve();
        return;
      }

      try {
        // Process all statements synchronously
        for (const statement of statements) {
          this.saveSingleStatementSync(documentId, statement);
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  private saveSingleStatementSync(documentId: number, statement: Statement): void {
    // Insert statement record
    // Use statement length as Stop position to satisfy Start < Stop constraint
    const startPos = 0;
    const stopPos = Math.max(1, statement.statement.length);

    const stmtSql = `
      INSERT INTO STATEMENTS (StatementTypeId, DocumentId, Start, Stop)
      VALUES (1, ?, ?, ?)
    `;

    const stmt = this.db!.prepare(stmtSql);
    const result = stmt.run(documentId, startPos, stopPos);
    const statementId = result.lastInsertRowid as number;

    // Save statement data
    this.saveEntityAndLinkSync(statementId, 1, statement.actor); // person
    this.saveEntityAndLinkSync(statementId, 2, statement.organization); // organization
    this.saveEntityAndLinkSync(statementId, 3, statement.concept); // concept
    this.saveBooleanDataSync(statementId, 4, statement.agree ? 1 : 0); // agreement
  }

  private saveEntityAndLinkSync(statementId: number, variableId: number, value: string): void {
    if (!value || value.trim() === '') {
      // Skip empty values
      return;
    }

    // First, try to find existing entity
    const findEntitySql = `SELECT ID FROM ENTITIES WHERE Name = ?`;
    const findStmt = this.db!.prepare(findEntitySql);
    const row = findStmt.get(value) as { ID: number } | undefined;

    let entityId: number;

    if (row) {
      entityId = row.ID;
    } else {
      // Create new entity
      const insertEntitySql = `INSERT INTO ENTITIES (Name) VALUES (?)`;
      const insertStmt = this.db!.prepare(insertEntitySql);
      const result = insertStmt.run(value);
      entityId = result.lastInsertRowid as number;
    }

    // Link entity to statement
    const linkSql = `INSERT INTO DATASHORTTEXT (StatementId, VariableId, Entity) VALUES (?, ?, ?)`;
    const linkStmt = this.db!.prepare(linkSql);
    linkStmt.run(statementId, variableId, entityId);
  }

  private saveBooleanDataSync(statementId: number, variableId: number, value: number): void {
    const sql = `INSERT INTO DATABOOLEAN (StatementId, VariableId, Value) VALUES (?, ?, ?)`;
    const stmt = this.db!.prepare(sql);
    stmt.run(statementId, variableId, value);
  }

  async exportToFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (this.dbPath === ':memory:') {
        reject(new Error('Cannot export in-memory database'));
        return;
      }

      try {
        // Close current connection
        this.db.close();
        this.db = null;

        // Copy the database file to the desired location with .dna extension
        fs.copyFileSync(this.dbPath, filePath);

        // Reinitialize the database
        this.initialize().then(resolve).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}
