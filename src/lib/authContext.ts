// src/lib/auth-context.ts
import { headers } from "next/headers";

export class AuthContextManager {
	private static instance: AuthContextManager;
	private context: { userId: string } | null = null;

	private constructor() {}

	static getInstance() {
		if (!AuthContextManager.instance) {
			AuthContextManager.instance = new AuthContextManager();
		}
		return AuthContextManager.instance;
	}

	setContext(userId: string) {
		this.context = { userId };
	}

	clearContext() {
		this.context = null;
	}

	getContext() {
		return this.context;
	}
}

// Helper function to run code with WebSocket auth context
export async function runWithWebSocketAuth<T>(
	userId: string,
	callback: () => Promise<T>,
): Promise<T> {
	const authManager = AuthContextManager.getInstance();
	authManager.setContext(userId);

	try {
		return await callback();
	} finally {
		authManager.clearContext();
	}
}
