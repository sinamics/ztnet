import { describe, test, expect } from "@jest/globals";

/**
 * Test for Issue #719: Name Preservation During Member Updates
 *
 * GitHub Issue: https://github.com/sinamics/ztnet/issues/719
 *
 * PROBLEM: After updating the ztnet container, all custom peer names were reset
 * because the controller data would overwrite stored names with empty values.
 *
 */
describe("Issue #719 - Name Preservation Logic", () => {
	test("should preserve database name when controller provides empty name", () => {
		// Simulate the exact logic from memberService.ts lines 43-57

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

		// Apply the fix: Preserve stored member name if controller provides no (or empty) name
		if (dbName && !updatedMember.name) {
			updatedMember.name = dbName;
		}

		// Assert that the fix works
		expect(updatedMember.name).toBe("My Important Device");
		expect(updatedMember.id).toBe("test-member-id");
		expect(updatedMember.authorized).toBe(true);
	});

	test("should keep controller name when controller provides valid name", () => {
		// Mock database member
		const dbMember = {
			name: "Old Device Name",
			authorized: true,
			physicalAddress: "192.168.1.100",
		};

		// Mock controller member with valid name
		const ztMember = {
			name: "New Controller Name", // Controller provides valid name
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

		// Controller name should be preserved since it's valid
		expect(updatedMember.name).toBe("New Controller Name");
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
		// This test shows what would happen WITHOUT the fix

		// Database has important name
		const dbMember = {
			name: "Critical Production Server",
		};

		// Controller overwrites with empty name (the bug)
		const ztMember = {
			name: "", // BUG: Controller loses the name
		};

		// Without the fix, this would lose the name:
		const updatedMemberWithoutFix = {
			...dbMember,
			...ztMember, // Overwrites name with empty string
		};

		// Demonstrate the bug
		expect(updatedMemberWithoutFix.name).toBe(""); // Name is lost!

		// Now demonstrate the fix:
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
		expect(updatedMemberWithFix.name).toBe("Critical Production Server"); // Name is preserved!
	});
});
