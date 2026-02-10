export interface WorldConfig {
	rootNodes: Array<{
		comments: string;
		identity: string;
		endpoints: string[];
	}>;
	signing: string[];
	output: string;
	plID: number;
	plBirth: number;
	plRecommend: boolean;
}
