export const setLocalStorageItem = <T>(key: string, value: T): void => {
	const existingConfig = localStorage.getItem("ztnet_config");
	const config = existingConfig ? JSON.parse(existingConfig) : {};
	config[key] = value;
	localStorage.setItem("ztnet_config", JSON.stringify(config));
};

export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
	const existingConfig = localStorage.getItem("ztnet_config");
	const config = existingConfig ? JSON.parse(existingConfig) : {};
	return config[key] ? config[key] : defaultValue;
};
