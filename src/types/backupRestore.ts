export interface BackupMetadata {
	docker?: boolean;
	version?: string;
	timestamp?: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any;
}
