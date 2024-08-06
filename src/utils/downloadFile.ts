export const downloadFile = (data: string, fileName: string) => {
	const element = document.createElement("a");
	const file = new Blob([data], { type: "text/plain" });
	element.href = URL.createObjectURL(file);
	element.download = fileName;
	document.body.appendChild(element);
	element.click();
};
