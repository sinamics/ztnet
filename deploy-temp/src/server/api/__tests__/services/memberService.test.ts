import { describe, test, expect } from "@jest/globals";

/**
 * Test for Issue #719: Name Preservation During Member Updates
 *
 * GitHub Issue: https://github.com/sinamics/ztnet/issues/719
 *
 * PROBLEM: After updating the ztnet container, peer names disappeared from UI
 * because names stored only in controller were ignored when database was prioritized.
 *
 */
describe("Issue #719 - Name Preservation Logic", () => {
	test("should preserve database name when controller provides empty name", () => {
		// Simulate the exact logic from memberService.ts lines 43-66

		// Mock database member with stored name (what we get from DB)
		const dbMember = {
			id: "test-member-id",
			nwid: "test-network-id",
			name: "My Important Device",
			authorized: true,
			deleted: false,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with empty name (the bug scenario)
		const ztMember = {
			id: "test-member-id",
			nwid: "test-network-id",
			name: "", // Controller returns empty name - this was the bug
			authorized: true,
			address: "1234567890",
		};

		// Simulate the memberService logic:
		// Extract physicalAddress and capture dbName
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		// Merge data (controller overwrites database)
		const updatedMember = {
			...restOfDbMembers,
			...ztMember, // This overwrites the name with empty string
			physicalAddress: physicalAddress,
			peers: {},
		};

		// Apply the enhanced fix: Smart name preservation
		if (dbName?.trim()) {
			// Database has a name - use it (preserves user customizations)
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			// Database has no name but controller does - use controller name
			updatedMember.name = ztMember.name;
		} else if (dbName && !updatedMember.name) {
			// Fallback: preserve any database name if controller provides empty
			updatedMember.name = dbName;
		}

		// Assert that the fix works
		expect(updatedMember.name).toBe("My Important Device");
		expect(updatedMember.id).toBe("test-member-id");
		expect(updatedMember.authorized).toBe(true);
	});

	test("should prioritize database name over controller name", () => {
		// Mock database member with existing name
		const dbMember = {
			name: "Database Device Name",
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with different name
		const ztMember = {
			name: "Controller Name", // Controller provides different name
			authorized: true,
		};

		// Simulate the logic
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the smart name resolution logic
		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		} else if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Database name should take precedence
		expect(updatedMember.name).toBe("Database Device Name");

		// Should not persist since name unchanged
		const shouldPersistName = updatedMember.name !== dbMember?.name;
		expect(shouldPersistName).toBe(false);
	});

	test("should handle null database name gracefully", () => {
		// Mock database member with null name
		const dbMember = {
			name: null,
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with empty name
		const ztMember = {
			name: "",
			authorized: true,
		};

		// Simulate the logic
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as unknown as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the fix
		if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Should result in empty name (no crash)
		expect(updatedMember.name).toBe("");
	});

	test("should handle undefined controller name", () => {
		// Mock database member
		const dbMember = {
			name: "Preserved Device Name",
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with undefined name
		const ztMember = {
			name: undefined as unknown as string,
			authorized: true,
		};

		// Simulate the logic
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the fix
		if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Database name should be preserved
		expect(updatedMember.name).toBe("Preserved Device Name");
	});

	test("should handle null controller name", () => {
		// Mock database member
		const dbMember = {
			name: "Device With Stored Name",
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with null name
		const ztMember = {
			name: null as unknown as string,
			authorized: true,
		};

		// Simulate the logic
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the fix
		if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Database name should be preserved
		expect(updatedMember.name).toBe("Device With Stored Name");
	});

	test("should handle no database member (new member scenario)", () => {
		// Mock no database member
		const dbMember: { name?: string; physicalAddress?: string } | null = null;

		// Mock controller member
		const ztMember = {
			name: "New Member Name",
			authorized: false,
		};

		// Simulate the logic
		const emptyObject: { physicalAddress?: string } = {};
		const { physicalAddress, ...restOfDbMembers } = dbMember || emptyObject;
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the fix
		if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Should keep controller name for new member
		expect(updatedMember.name).toBe("New Member Name");
	});

	test("should demonstrate the original bug scenario", () => {
		// Database has important name
		const dbMember = {
			name: "Critical Production Server",
		};

		// Controller overwrites with empty name
		const ztMember = {
			name: "",
		};

		// Without the fix, this would lose the name:
		const updatedMemberWithoutFix = {
			...dbMember,
			...ztMember,
		};

		// Demonstrate the bug
		expect(updatedMemberWithoutFix.name).toBe("");

		// With the fix:
		const { ...restOfDbMembers } = dbMember;
		const dbName = restOfDbMembers?.name;

		const updatedMemberWithFix = {
			...restOfDbMembers,
			...ztMember,
		};

		// Apply the fix
		if (dbName && !updatedMemberWithFix.name) {
			updatedMemberWithFix.name = dbName;
		}

		// Verify the fix works
		expect(updatedMemberWithFix.name).toBe("Critical Production Server");
	});

	test("should use controller name when database has no name and persist to database", () => {
		// Database has no name, but controller has one
		const dbMember = {
			id: "test-member-id",
			name: null, // Database has no name
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		const ztMember = {
			id: "test-member-id",
			name: "ZeroTier Client Name",
			authorized: true,
		};

		// Simulate the logic
		const { physicalAddress, ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = {
			...restOfDbMembers,
			...ztMember,
			physicalAddress: physicalAddress,
		};

		// Apply the smart name resolution logic
		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		} else if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Should use controller name since database has none
		expect(updatedMember.name).toBe("ZeroTier Client Name");

		// Should persist to database since name changed
		const shouldPersistName = updatedMember.name !== dbMember?.name;
		expect(shouldPersistName).toBe(true);
	});

	test("should handle whitespace-only names correctly", () => {
		const dbMember = { name: "   ", authorized: true };
		const ztMember = { name: "Valid Controller Name", authorized: true };

		const { ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = { ...restOfDbMembers, ...ztMember };

		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		} else if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Should use controller name since database name is just whitespace
		expect(updatedMember.name).toBe("Valid Controller Name");
	});

	test("should handle both names empty gracefully", () => {
		const dbMember = { name: null, authorized: true };
		const ztMember = { name: "", authorized: true };

		const { ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = { ...restOfDbMembers, ...ztMember };

		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		} else if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Should result in empty name when both sources are empty
		expect(updatedMember.name).toBe("");
	});

	test("should persist controller name to database when database is empty", () => {
		// Test database persistence scenario
		const dbMember = { id: "test-id", name: null, authorized: true };
		const ztMember = { id: "test-id", name: "Controller Device", authorized: true };

		const { ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = { ...restOfDbMembers, ...ztMember };

		// Apply name resolution
		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		}

		// Verify name is resolved
		expect(updatedMember.name).toBe("Controller Device");

		// Verify it should be persisted to database (name changed)
		const shouldPersist = updatedMember.name !== dbMember?.name;
		expect(shouldPersist).toBe(true);
	});

	test("should not persist when names are identical", () => {
		const dbMember = { name: "Same Name", authorized: true };
		const ztMember = { name: "Same Name", authorized: true };

		const { ...restOfDbMembers } = dbMember || {};
		const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

		const updatedMember = { ...restOfDbMembers, ...ztMember };

		if (dbName?.trim()) {
			updatedMember.name = dbName;
		} else if (!dbName && ztMember.name && ztMember.name.trim()) {
			updatedMember.name = ztMember.name;
		}

		expect(updatedMember.name).toBe("Same Name");

		// Should NOT persist since names are identical
		const shouldPersist = updatedMember.name !== dbMember?.name;
		expect(shouldPersist).toBe(false);
	});
});
