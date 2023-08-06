export interface CentralControllerStatus {
	id: string;
	type: string;
	online: boolean;
	clock: number;
	version: string;
	apiVersion: string;
	uptime: number;
	secondFactor: boolean;
	stripePublishableKey: string;
	clusterNode: string;
	supportEmbedCode: string;
	loginHtmlBlurb: string;
	user: User;
	loginMethods: LoginMethods;
	readOnlyMode: boolean;
	oidcConfig: OIDCConfig;
	features: Features;
	defaultLimits: DefaultLimits;
}

interface User {
	id: string;
	type: string;
	creationTime: number;
	globalPermissions: GlobalPermissions;
	displayName: string;
	email: string;
	auth: Auth;
	tokens: string[];
	accountLimits: AccountLimits;
	marketingOptIn: boolean;
}

interface GlobalPermissions {
	a: boolean;
	d: boolean;
	m: boolean;
	r: boolean;
}

interface Auth {
	oidc: string;
}

interface AccountLimits {
	enabled: boolean;
	billingV2: boolean;
	maxMembers: number;
	currentMembers: number;
	maxAdmins: number;
	currentAdmins: number;
	maxSSO: number;
	currentSSO: number;
}

interface LoginMethods {
	local: boolean;
	google: boolean;
	twitter: boolean;
	facebook: boolean;
	github: boolean;
	saml: boolean;
	oidc: boolean;
}

interface OIDCConfig {
	manageAccountURL: string;
	logoutURL: string;
}

interface Features {
	ztAudit: boolean;
	ztBillingV2: boolean;
	ztMemberLimits: boolean;
	ztThirdPartyOIDCSSO: boolean;
}

interface DefaultLimits {
	maxMembers: number;
	maxAdmins: number;
	maxSSO: number;
}
