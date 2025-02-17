// src/utils/localstorage.ts
"use client";

const isBrowser = typeof window !== "undefined";

export const setLocalStorageItem = <T>(key: string, value: T): void => {
	if (!isBrowser) return;

	const existingConfig = localStorage.getItem("ztnet_config");
	const config = existingConfig ? JSON.parse(existingConfig) : {};
	config[key] = value;
	localStorage.setItem("ztnet_config", JSON.stringify(config));
};

export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
	if (!isBrowser) return defaultValue;

	const existingConfig = localStorage.getItem("ztnet_config");
	const config = existingConfig ? JSON.parse(existingConfig) : {};
	return config[key] ? config[key] : defaultValue;
};
