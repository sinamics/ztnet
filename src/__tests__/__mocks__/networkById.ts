import "@testing-library/jest-dom";

jest.mock("../../utils/api", () => ({
	api: {
		auth: {
			me: {
				useQuery: () => ({
					data: {
						user: {
							id: "1234567890",
							email: "",
							role: "ADMIN",
							verified: true,
							avatar: null,
							createdAt: "2021-05-04T12:00:00.000Z",
							updatedAt: "2021-05-04T12:00:00.000Z",
						},
					},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
		},
		admin: {
			getAllOptions: {
				useQuery: () => ({
					data: {},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
		},
		networkMember: {
			getNetworkMemberById: {
				useQuery: () => ({
					data: {},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
			updateNetworkMember: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			deleteNetworkMember: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			stash: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			UpdateDatabaseOnly: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			create: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			delete: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			Update: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
		},
		network: {
			getNetworkById: {
				useQuery: () => ({
					data: {
						network: {
							nwid: "1234567890",
							name: "Test Network",
							private: true,
							ipAssignmentPools: [
								{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" },
							],
							routes: [{ target: "10.0.0.0/24" }],
							dns: {
								domain: "",
								servers: [],
							},
							tags: [],
							multicastLimit: 32,
							enableBroadcast: true,
							rutes: [
								{
									target: "172.25.28.0/24",
									via: null,
								},
							],
							rules: [
								{
									not: false,
									or: false,
									type: "ACTION_ACCEPT",
								},
							],
							v4AssignMode: {
								zt: false, // Changed state to checked
							},
						},
						members: [],
						zombieMembers: [],
					},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
			updateNetwork: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			getFlowRule: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			setFlowRule: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			deleteNetwork: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			inviteUserByMail: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			networkName: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			networkDescription: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			privatePublicNetwork: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			enableIpv4AutoAssign: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			easyIpAssignment: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			advancedIpAssignment: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			managedRoutes: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			dns: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
			multiCast: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
		},
	},
}));
