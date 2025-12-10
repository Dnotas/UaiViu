import rules from "../../rules";

const check = (role, action, data) => {
	console.log("🔍 Can check:", { role, action, hasData: !!data });

	// Proteção contra role null/undefined
	if (!role) {
		console.warn("⚠️ Can: role is null/undefined");
		return false;
	}

	const permissions = rules[role];
	if (!permissions) {
		console.warn("⚠️ Can: No permissions found for role:", role);
		return false;
	}

	const staticPermissions = permissions.static;
	console.log("🔍 staticPermissions:", staticPermissions, "type:", typeof staticPermissions, "isArray:", Array.isArray(staticPermissions));

	// Proteção robusta contra staticPermissions null/undefined
	if (staticPermissions && Array.isArray(staticPermissions) && staticPermissions.includes(action)) {
		console.log("✅ Can: Permission granted for", action);
		return true;
	}

	const dynamicPermissions = permissions.dynamic;

	if (dynamicPermissions) {
		const permissionCondition = dynamicPermissions[action];
		if (!permissionCondition) {
			// dynamic rule not provided for action
			return false;
		}

		return permissionCondition(data);
	}
	return false;
};

const Can = ({ role, perform, data, yes, no }) =>
	check(role, perform, data) ? yes() : no();

Can.defaultProps = {
	yes: () => null,
	no: () => null,
};

export { Can };
