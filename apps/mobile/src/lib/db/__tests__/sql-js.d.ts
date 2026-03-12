declare module 'sql.js' {
	export interface BindParams extends Array<number | string | Uint8Array | null> {}

	export interface QueryExecResult {
		columns: string[];
		values: (number | string | Uint8Array | null)[][];
	}

	export interface Statement {
		bind(params?: BindParams): boolean;
		step(): boolean;
		getAsObject(): Record<string, number | string | Uint8Array | null>;
		free(): boolean;
	}

	export interface Database {
		run(sql: string, params?: BindParams): Database;
		exec(sql: string): QueryExecResult[];
		prepare(sql: string): Statement;
		getRowsModified(): number;
		close(): void;
		export(): Uint8Array;
	}

	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
	}

	export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
}
