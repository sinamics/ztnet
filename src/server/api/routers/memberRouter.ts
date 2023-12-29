import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { type MemberEntity } from "~/types/local/member";
import { checkUserOrganizationRole } from "~/utils/role";
import { Role } from "@prisma/client";
import {
	HookType,
	MemberConfigChanged,
	MemberDeleted,
	MemberJoined,
} from "~/types/webhooks";
import { sendWebhook } from "~/utils/webhook";
import { throwError } from "~/server/helpers/errorHandler";

const isValidZeroTierNetworkId = (id: string) => {
	const hexRegex = /^[0-9a-fA-F]{10}$/;
	return hexRegex.test(id);
};

export const networkMemberRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const networks = await ctx.prisma.network.findMany({
			where: {
				authorId: ctx.session.user.id,
			},
		});
		return networks;
	}),
	getMemberById: protectedProcedure
		.input(
			z.object({
				central: z.boolean().default(false),
				id: z.string({ required_error: "No member id provided!" }),
				nwid: z.string({ required_error: "No network id provided!" }),
			}),
		)
		.query(async ({ ctx, input }) => {
			const ztMembers = await ztController.member_details(
				ctx,
				input.nwid,
				input.id,
				input.central,
			);

			if (input.central) {
				return ztController.flattenCentralMember(ztMembers);
			}
			const dbMember = await ctx.prisma.network_members.findFirst({
				where: {
					id: input.id,
					nwid: input.nwid, // this should be the value of `nwid` you are looking for
				},
			});
			return {
				...dbMember,
				...ztMembers,
			};
		}),
	create: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				id: z
					.string({ required_error: "No member id provided!" })
					.refine(isValidZeroTierNetworkId, {
						message:
							"Invalid ZeroTier network id provided. It should be a 10-digit hexadecimal number.",
					}),
				nwid: z.string({ required_error: "No network id provided!" }),
				central: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Created member ${input.id} in network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			if (input.central) {
				return await ztController.member_update({
					ctx,
					nwid: input.nwid,
					memberId: input.id,
					central: input.central,
					updateParams: {
						hidden: false,
					},
				});
			}
			// check if user exist in db, and if so set deleted:false
			const member = await ctx.prisma.network_members.findUnique({
				where: {
					id_nwid: {
						id: input.id,
						nwid: input.nwid, // this should be the value of `nwid` you are looking for
					},
				},
			});
			if (member) {
				return await ctx.prisma.network_members.update({
					where: {
						id_nwid: {
							id: input.id,
							nwid: input.nwid, // this should be the value of `nwid` you are looking for
						},
					},
					data: {
						deleted: false,
					},
				});
			}

			try {
				// Send webhook
				await sendWebhook<MemberJoined>({
					hookType: HookType.NETWORK_JOIN,
					organizationId: input?.organizationId,
					memberId: input.id,
					networkId: input.nwid,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			// if not, create new member
			await ctx.prisma.network_members.create({
				data: {
					id: input.id,
					address: input.id,
					lastSeen: new Date(),
					creationTime: new Date(),
					nwid_ref: {
						connect: { nwid: input.nwid },
					},
				},
			});
		}),

	Update: protectedProcedure
		.input(
			z.object({
				nwid: z.string({ required_error: "No network id provided!" }),
				memberId: z.string({ required_error: "No member id provided!" }),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					activeBridge: z.boolean().optional(),
					noAutoAssignIps: z.boolean().optional(),
					ipAssignments: z
						.array(z.string({ required_error: "No Ip assignment provided!" }))
						.optional(),
					authorized: z
						.boolean({ required_error: "No boolean value provided!" })
						.optional(),
					capabilities: z.array(z.number()).optional(),
					tags: z.array(z.tuple([z.number(), z.number()])).optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated member ${input.memberId} in network ${
						input.nwid
					}. ${JSON.stringify(input.updateParams)}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			const payload: Partial<MemberEntity> = {};

			// update capabilities
			if (typeof input.updateParams.capabilities === "object") {
				// update member
				Object.assign(payload, {}, { capabilities: input.updateParams.capabilities });
			}

			// update tags
			if (typeof input.updateParams.tags === "object") {
				// update member
				Object.assign(payload, {}, { tags: input.updateParams.tags });
			}
			// update noAutoAssignIps
			if (typeof input.updateParams.activeBridge === "boolean") {
				// update member
				Object.assign(payload, {}, { activeBridge: input.updateParams.activeBridge });
			}
			// update noAutoAssignIps
			if (typeof input.updateParams.noAutoAssignIps === "boolean") {
				// update member
				Object.assign(
					payload,
					{},
					{ noAutoAssignIps: input.updateParams.noAutoAssignIps },
				);
			}

			// update ip specified by user UI
			if (input.updateParams.ipAssignments) {
				// update member
				Object.assign(payload, {}, { ipAssignments: input.updateParams.ipAssignments });
			}

			// update authorized
			if (typeof input.updateParams.authorized === "boolean") {
				Object.assign(payload, {}, { authorized: input.updateParams.authorized });
			}

			const updateParams = input.central ? { config: { ...payload } } : { ...payload };

			// if central is true, send the request to the central API and return the response
			const updatedMember = await ztController
				.member_update({
					ctx,
					nwid: input.nwid,
					memberId: input.memberId,
					central: input.central,
					// @ts-expect-error
					updateParams,
				})
				.catch(() => {
					throw new TRPCError({
						message:
							"Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
						code: "FORBIDDEN",
					});
				});

			try {
				// Send webhook
				await sendWebhook<MemberConfigChanged>({
					hookType: HookType.MEMBER_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					memberId: input.memberId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: payload,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			if (input.central) return updatedMember;
		}),
	Tags: protectedProcedure
		.input(
			z.object({
				nwid: z.string({ required_error: "No network id provided!" }),
				memberId: z.string({ required_error: "No member id provided!" }),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					tags: z
						.array(z.tuple([z.number(), z.number()]).or(z.array(z.never())))
						.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated tags for member ${input.memberId} in network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			const tags = input.updateParams.tags;
			const adjustedTags = tags && tags.length === 0 ? [] : tags;

			const payload: Partial<MemberEntity> = {};
			Object.assign(payload, {}, { tags: adjustedTags });

			const updateParams = input.central ? { config: { ...payload } } : { ...payload };

			// if central is true, send the request to the central API and return the response
			const updatedMember = await ztController
				.member_update({
					ctx,
					nwid: input.nwid,
					memberId: input.memberId,
					central: input.central,
					// @ts-expect-error
					updateParams,
				})
				.catch(() => {
					throw new TRPCError({
						message:
							"Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
						code: "FORBIDDEN",
					});
				});

			try {
				// Send webhook
				await sendWebhook<MemberConfigChanged>({
					hookType: HookType.MEMBER_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					memberId: input.memberId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: payload,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
			return updatedMember;
		}),
	UpdateDatabaseOnly: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				id: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					deleted: z.boolean().optional(),
					name: z.string().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated member ${input.id} in network ${input.nwid}. ${JSON.stringify(
						input.updateParams,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			// if central is true, send the request to the central API and return the response
			if (input.central && input?.updateParams?.name) {
				return await ztController
					.member_update({
						ctx,
						nwid: input.nwid,
						memberId: input.id,
						central: input.central,
						updateParams: input.updateParams,
					})
					.catch(() => {
						throw new TRPCError({
							message:
								"Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
							code: "FORBIDDEN",
						});
					});
			}

			// if users click the re-generate icon on IP address
			const response = await ctx.prisma.network.update({
				where: {
					nwid: input.nwid,
				},
				data: {
					networkMembers: {
						update: {
							where: {
								id_nwid: {
									id: input.id,
									nwid: input.nwid, // this should be the value of `nwid` you are looking for
								},
							},
							data: {
								...input.updateParams,
							},
						},
					},
				},
				include: {
					networkMembers: {
						where: {
							id: input.id,
						},
					},
				},
			});

			try {
				// Send webhook
				await sendWebhook<MemberConfigChanged>({
					hookType: HookType.MEMBER_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					memberId: input.id,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
			return { member: response.networkMembers[0] };
		}),
	stash: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				nwid: z.string({ required_error: "network ID not provided!" }),
				id: z.string({ required_error: "id not provided!" }),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Stashed member ${input.id} in network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			const caller = networkMemberRouter.createCaller(ctx);
			//user needs to be de-authorized before deleted.
			// adding try catch to prevent error if user is not part of the network but still in the database.
			try {
				await caller.Update({
					memberId: input.id,
					nwid: input.nwid,
					updateParams: { authorized: false },
				});
			} catch (error) {
				console.error(error);
			}

			// Set member with deleted status in database.
			const memberUpdate = await ctx.prisma.network
				.update({
					where: {
						nwid: input.nwid,
					},
					data: {
						networkMembers: {
							updateMany: {
								where: { id: input.id, nwid: input.nwid },
								data: {
									deleted: true,
								},
							},
						},
					},
					include: {
						networkMembers: {
							where: {
								id: input.id,
								deleted: false,
							},
						},
					},
				})
				// biome-ignore lint/suspicious/noConsoleLog: <explanation>
				.catch((err: string) => console.log(err));

			try {
				// Send webhook
				await sendWebhook<MemberConfigChanged>({
					hookType: HookType.MEMBER_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					memberId: input.id,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: { stashed: true },
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			return memberUpdate;
		}),
	delete: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				central: z.boolean().default(false),
				nwid: z.string({ required_error: "network ID not provided!" }),
				id: z.string({ required_error: "memberId not provided!" }),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Deleted member ${input.id} in network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			// remove member from controller
			const deleted = await ztController.member_delete({
				ctx,
				central: input.central,
				nwid: input.nwid,
				memberId: input.id,
			});

			if (input.central) return deleted;

			await ctx.prisma.network_members.delete({
				where: {
					id_nwid: {
						id: input.id,
						nwid: input.nwid,
					},
				},
			});

			try {
				// Send webhook
				await sendWebhook<MemberDeleted>({
					hookType: HookType.MEMBER_DELETED,
					organizationId: input?.organizationId,
					deletedMemberId: input.id,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
		}),
	getMemberAnotations: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				nodeid: z.number(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.prisma.networkMemberNotation.findMany({
				where: {
					nodeid: input.nodeid,
				},
				include: {
					label: true,
				},
			});
		}),
	removeMemberAnotations: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				notationId: z.number(),
				nodeid: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Removed notation ${input.notationId} from member ${input.nodeid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});
			await ctx.prisma.networkMemberNotation.delete({
				where: {
					notationId_nodeid: {
						notationId: input.notationId,
						nodeid: input.nodeid,
					},
				},
			});

			// Check if the notation is still used by any other member
			const otherNotations = await ctx.prisma.networkMemberNotation.findMany({
				where: {
					notationId: input.notationId,
				},
			});

			// If the notation is not used by any other member, delete it
			if (otherNotations.length === 0) {
				await ctx.prisma.notation.delete({
					where: {
						id: input.notationId,
					},
				});
			}
		}),
});
