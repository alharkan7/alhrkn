-- Complete SQL Schema Generated from ERD File
-- Generated on: 2025-10-03T16:23:15.943Z

CREATE TABLE IF NOT EXISTS CODERS (
    ID INTEGER NOT NULL PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE CHECK (LENGTH(Name) < 191),
    Red INTEGER NOT NULL DEFAULT 0 CHECK (Red BETWEEN 0 AND 255),
    Green INTEGER NOT NULL DEFAULT 0 CHECK (Green BETWEEN 0 AND 255),
    Blue INTEGER NOT NULL DEFAULT 0 CHECK (Blue BETWEEN 0 AND 255),
    Refresh INTEGER NOT NULL CHECK (Refresh BETWEEN 0 AND 9999) DEFAULT 0,
    FontSize INTEGER NOT NULL CHECK (FontSize BETWEEN 1 AND 99) DEFAULT 14,
    Password TEXT NOT NULL CHECK (LENGTH(Password) < 191),
    PopupWidth INTEGER CHECK (PopupWidth BETWEEN 100 AND 9999) DEFAULT 300,
    ColorByCoder INTEGER NOT NULL CHECK (ColorByCoder BETWEEN 0 AND 1) DEFAULT 0,
    PopupDecoration INTEGER NOT NULL CHECK (PopupDecoration BETWEEN 0 AND 1) DEFAULT 0,
    PopupAutoComplete INTEGER NOT NULL CHECK (PopupAutoComplete BETWEEN 0 AND 1) DEFAULT 1,
    PermissionAddDocuments INTEGER NOT NULL CHECK (PermissionAddDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditDocuments INTEGER NOT NULL CHECK (PermissionEditDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionDeleteDocuments INTEGER NOT NULL CHECK (PermissionDeleteDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionImportDocuments INTEGER NOT NULL CHECK (PermissionImportDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionAddStatements INTEGER NOT NULL CHECK (PermissionAddStatements BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditStatements INTEGER NOT NULL CHECK (PermissionEditStatements BETWEEN 0 AND 1) DEFAULT 1,
    PermissionDeleteStatements INTEGER NOT NULL CHECK (PermissionDeleteStatements BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditAttributes INTEGER NOT NULL CHECK (PermissionEditAttributes BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditRegex INTEGER NOT NULL CHECK (PermissionEditRegex BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditStatementTypes INTEGER NOT NULL CHECK (PermissionEditStatementTypes BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditCoders INTEGER NOT NULL CHECK (PermissionEditCoders BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditCoderRelations INTEGER NOT NULL CHECK (PermissionEditCoderRelations BETWEEN 0 AND 1) DEFAULT 1,
    PermissionViewOthersDocuments INTEGER NOT NULL CHECK (PermissionViewOthersDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditOthersDocuments INTEGER NOT NULL CHECK (PermissionEditOthersDocuments BETWEEN 0 AND 1) DEFAULT 1,
    PermissionViewOthersStatements INTEGER NOT NULL CHECK (PermissionViewOthersStatements BETWEEN 0 AND 1) DEFAULT 1,
    PermissionEditOthersStatements INTEGER NOT NULL CHECK (PermissionEditOthersStatements BETWEEN 0 AND 1) DEFAULT 1
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
    Notes TEXT NOT NULL DEFAULT '',
    ParentEntityId INTEGER,
    FOREIGN KEY(ParentEntityId) REFERENCES ENTITIES(ID) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS ATTRIBUTEVARIABLES (
    ID INTEGER NOT NULL PRIMARY KEY,
    Variable TEXT NOT NULL UNIQUE CHECK (LENGTH(Variable) < 191),
    DataType TEXT NOT NULL CHECK (DataType IN ('boolean', 'integer', 'long text', 'short text')) DEFAULT 'short text',
    VariableId INTEGER,
    FOREIGN KEY(VariableId) REFERENCES VARIABLES(ID) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS CODERRELATIONS (
    ID INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS REGEXES (
    ID INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS SETTINGS (
    ID INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS VARIABLELINKS (
    ID INTEGER PRIMARY KEY
);

-- Initial Data
INSERT OR IGNORE INTO CODERS (ID, Name, Red, Green, Blue, Refresh, FontSize, Password, PopupWidth, ColorByCoder, PopupDecoration, PopupAutoComplete, PermissionAddDocuments, PermissionEditDocuments, PermissionDeleteDocuments, PermissionImportDocuments, PermissionAddStatements, PermissionEditStatements, PermissionDeleteStatements, PermissionEditAttributes, PermissionEditRegex, PermissionEditStatementTypes, PermissionEditCoders, PermissionEditCoderRelations, PermissionViewOthersDocuments, PermissionEditOthersDocuments, PermissionViewOthersStatements, PermissionEditOthersStatements)
VALUES (1, 'Admin', 255, 0, 0, 0, 14, '', 300, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);

INSERT OR IGNORE INTO STATEMENTTYPES (ID, Type, Red, Green, Blue) VALUES (1, 'DNA Statement', 239, 208, 51);

INSERT OR IGNORE INTO VARIABLES (ID, Variable, DataType, StatementTypeId) VALUES
(1, 'person', 'short text', 1),
(2, 'organization', 'short text', 1),
(3, 'concept', 'short text', 1),
(4, 'agreement', 'boolean', 1);
