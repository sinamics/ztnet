import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { prisma } from "~/server/db";

interface OrganizationAdminNotificationData {
	organizationId: string;
	eventType:
		| "NODE_ADDED"
		| "NODE_DELETED"
		| "NODE_PERMANENTLY_DELETED"
		| "USER_ADDED"
		| "USER_REMOVED"
		| "PERMISSION_CHANGED"
		| "NETWORK_CREATED"
		| "NETWORK_DELETED";
	eventData: {
		actorEmail?: string;
		actorName?: string;
		targetName?: string;
		targetEmail?: string;
		targetId?: string;
		networkName?: string;
		networkId?: string;
		nodeName?: string;
		nodeId?: string;
		oldRole?: string;
		newRole?: string;
		additionalInfo?: string;
	};
}

export async function sendOrganizationAdminNotification(
	data: OrganizationAdminNotificationData,
) {
	try {
		// Get organization settings to check if notifications are enabled
		const orgSettings = await prisma.organizationSettings.findFirst({
			where: {
				organizationId: data.organizationId,
			},
		});

		// Check if email notifications are enabled and the specific event type is enabled
		if (!orgSettings?.emailNotificationsEnabled) {
			return;
		}

		let isEventEnabled = false;
		let notificationMessage = "";

		switch (data.eventType) {
			case "NODE_ADDED": {
				isEventEnabled = orgSettings.nodeAddedNotification ?? false;
				// Check if network name is just the network ID (fallback case when name is null)
				const hasNetworkName =
					data.eventData.networkName &&
					data.eventData.networkName !== data.eventData.networkId;
				const networkDisplay = hasNetworkName
					? `network "${data.eventData.networkName}" (${data.eventData.networkId})`
					: `network ${data.eventData.networkId}`;
				notificationMessage = `A new node "${data.eventData.nodeName}" (${data.eventData.nodeId}) has joined ${networkDisplay} in your organization.`;
				break;
			}
			case "NODE_DELETED": {
				isEventEnabled = orgSettings.nodeDeletedNotification ?? false;
				// Check if network name is just the network ID (fallback case when name is null)
				const hasNetworkName =
					data.eventData.networkName &&
					data.eventData.networkName !== data.eventData.networkId;
				const networkDisplay = hasNetworkName
					? `network "${data.eventData.networkName}" (${data.eventData.networkId})`
					: `network ${data.eventData.networkId}`;
				notificationMessage = `Node "${data.eventData.nodeName}" (${data.eventData.nodeId}) has been stashed from ${networkDisplay} in your organization.`;
				break;
			}
			case "NODE_PERMANENTLY_DELETED": {
				isEventEnabled = orgSettings.nodePermanentlyDeletedNotification ?? false;
				// Check if network name is just the network ID (fallback case when name is null)
				const hasNetworkName =
					data.eventData.networkName &&
					data.eventData.networkName !== data.eventData.networkId;
				const networkDisplay = hasNetworkName
					? `network "${data.eventData.networkName}" (${data.eventData.networkId})`
					: `network ${data.eventData.networkId}`;
				notificationMessage = `Node "${data.eventData.nodeName}" (${data.eventData.nodeId}) has been permanently deleted from ${networkDisplay} in your organization.`;
				break;
			}
			case "USER_ADDED":
				isEventEnabled = orgSettings.userAddedNotification ?? false;
				notificationMessage = `User "${data.eventData.targetName}" (${data.eventData.targetEmail}) has been added to your organization by ${data.eventData.actorName}.`;
				break;
			case "USER_REMOVED":
				isEventEnabled = orgSettings.userRemovedNotification ?? false;
				notificationMessage = `User "${data.eventData.targetName}" (${data.eventData.targetEmail}) has been removed from your organization by ${data.eventData.actorName}.`;
				break;
			case "PERMISSION_CHANGED":
				isEventEnabled = orgSettings.permissionChangedNotification ?? false;
				notificationMessage = `User "${data.eventData.targetName}" (${data.eventData.targetEmail}) role has been changed from "${data.eventData.oldRole}" to "${data.eventData.newRole}" by ${data.eventData.actorName}.`;
				break;
			case "NETWORK_CREATED": {
				isEventEnabled = orgSettings.networkCreatedNotification ?? false;
				// Check if network name is just the network ID (fallback case when name is null)
				const hasNetworkName = data.eventData.networkName !== data.eventData.networkId;
				notificationMessage = hasNetworkName
					? `A new network "${data.eventData.networkName}" (${data.eventData.networkId}) has been created in your organization by ${data.eventData.actorName}.`
					: `A new network ${data.eventData.networkId} has been created in your organization by ${data.eventData.actorName}.`;
				break;
			}
			case "NETWORK_DELETED": {
				isEventEnabled = orgSettings.networkDeletedNotification ?? false;
				// Check if network name is just the network ID (fallback case when name is null)
				const hasNetworkName = data.eventData.networkName !== data.eventData.networkId;
				notificationMessage = hasNetworkName
					? `Network "${data.eventData.networkName}" (${data.eventData.networkId}) has been deleted from your organization by ${data.eventData.actorName}.`
					: `Network ${data.eventData.networkId} has been deleted from your organization by ${data.eventData.actorName}.`;
				break;
			}
			default:
				return;
		}

		if (!isEventEnabled) {
			return;
		}

		// Get all admin users for the organization
		const orgAdmins = await prisma.userOrganizationRole.findMany({
			where: {
				organizationId: data.organizationId,
				role: "ADMIN",
			},
			include: {
				user: {
					select: {
						email: true,
						name: true,
					},
				},
			},
		});

		// Get organization details
		const organization = await prisma.organization.findFirst({
			where: {
				id: data.organizationId,
			},
			select: {
				orgName: true,
			},
		});

		// Send email to each admin
		for (const admin of orgAdmins) {
			await sendMailWithTemplate(MailTemplateKey.Notification, {
				to: admin.user.email,
				templateData: {
					toName: admin.user.name || admin.user.email,
					notificationMessage: notificationMessage,
					organizationName: organization?.orgName || "Unknown Organization",
				},
			});
		}

		// console.log(`Organization admin notification sent for ${data.eventType} in organization ${data.organizationId}`);
	} catch (error) {
		console.error("Failed to send organization admin notification:", error);
	}
}
