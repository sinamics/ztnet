import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		return response.status(405).json({ message: "Method not allowed" });
	}

	try {
		const session = await getServerSession(request, response, authOptions);
		if (!session) {
			return response.status(401).json({ message: "Not authenticated" });
		}
		const { userId, deviceId } = await request.body;

		if (!userId || !deviceId) {
			return NextResponse.json({ error: "Missing userId or deviceId" }, { status: 400 });
		}

		const userDevice = await prisma.userDevice.findUnique({
			where: {
				userId,
				deviceId,
			},
		});

		if (!userDevice) {
			// Device doesn't exist, invalidate the token
			await prisma.user.update({
				where: { id: userId },
				data: { isActive: false },
			});

			return NextResponse.json({ message: "User invalidated" }, { status: 200 });
		}

		// Update lastActive field
		await prisma.userDevice.update({
			where: {
				userId,
				deviceId,
			},
			data: {
				lastActive: new Date(),
			},
		});

		return NextResponse.json({ message: "Device updated" }, { status: 200 });
	} catch (error) {
		console.error("Error in user invalidation:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
