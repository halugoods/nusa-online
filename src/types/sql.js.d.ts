declare module "sql.js" {
  export interface SqlValue {
    [key: string]: any;
  }

  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  export interface Statement {
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): void;
    bind(values?: Record<string, any> | any[]): boolean;
    run(values?: Record<string, any> | any[]): void;
  }

  export interface Database {
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
    run(sql: string, params?: Record<string, any> | any[]): Database;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  const initSqlJs: (options?: InitSqlJsOptions) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
