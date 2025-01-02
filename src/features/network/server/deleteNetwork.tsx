export async function deleteNetwork(networkId: string) {
	const response = await fetch(`/api/networks/${networkId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error("Failed to delete network");
	}

	return response.json();
}
