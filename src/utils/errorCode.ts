export enum ErrorCode {
	IncorrectUsernamePassword = "incorrect-username-password",
	UserNotFound = "user-not-found",
	UserNotAuthenticated = "not-authenticated",
	IncorrectPassword = "incorrect-password",
	UserMissingPassword = "missing-password",
	TwoFactorDisabled = "two-factor-disabled",
	TwoFactorAlreadyEnabled = "two-factor-already-enabled",
	TwoFactorSetupRequired = "two-factor-setup-required",
	InvalidToken = "invalid-token",
	TokenRequired = "token-required",
	SecondFactorRequired = "second-factor-required",
	IncorrectTwoFactorCode = "incorrect-two-factor-code",
	InternalServerError = "internal-server-error",
	NewPasswordMatchesOld = "new-password-matches-old",
	ThirdPartyIdentityProviderEnabled = "third-party-identity-provider-enabled",
	TooManyRequests = "too-many-requests",
	RegistrationDisabled = "registration_disabled",
}

interface ErrorDetails {
	message: string;
	action?: string;
}

export const ErrorMessages: Record<ErrorCode, ErrorDetails> = {
	[ErrorCode.IncorrectUsernamePassword]: {
		message: "Invalid email or password.",
		action: "Please check your credentials and try again.",
	},
	[ErrorCode.UserNotFound]: {
		message: "User not found.",
		action: "Please check your username or consider registering.",
	},
	[ErrorCode.UserNotAuthenticated]: {
		message: "User not authenticated.",
		action: "Please log in to access this resource.",
	},
	[ErrorCode.IncorrectPassword]: {
		message: "Incorrect password.",
		action: "Please check your password and try again.",
	},
	[ErrorCode.UserMissingPassword]: {
		message: "User account is missing a password.",
		action: "Please set up a password for your account.",
	},
	[ErrorCode.TwoFactorDisabled]: {
		message: "Two-factor authentication is disabled.",
	},
	[ErrorCode.TwoFactorAlreadyEnabled]: {
		message: "Two-factor authentication is already enabled.",
	},
	[ErrorCode.TwoFactorSetupRequired]: {
		message: "Two-factor authentication setup is required.",
		action: "Please set up two-factor authentication for your account.",
	},
	[ErrorCode.InvalidToken]: {
		message: "Invalid token provided.",
		action: "Please request a new token and try again.",
	},
	[ErrorCode.TokenRequired]: {
		message: "Token is required for this action.",
		action: "Please provide a valid token.",
	},
	[ErrorCode.SecondFactorRequired]: {
		message: "Second factor authentication is required.",
		action: "Please provide your second factor authentication code.",
	},
	[ErrorCode.IncorrectTwoFactorCode]: {
		message: "Incorrect two-factor authentication code.",
		action: "Please check your code and try again.",
	},
	[ErrorCode.InternalServerError]: {
		message: "An internal server error occurred.",
		action: "Please try again later or contact support if the problem persists.",
	},
	[ErrorCode.NewPasswordMatchesOld]: {
		message: "New password matches the old password.",
		action: "Please choose a different password.",
	},
	[ErrorCode.ThirdPartyIdentityProviderEnabled]: {
		message: "Third-party identity provider is enabled.",
		action: "Please use the appropriate third-party login method.",
	},
	[ErrorCode.TooManyRequests]: {
		message: "Too many requests.",
		action: "Please wait a while before trying again.",
	},
	[ErrorCode.RegistrationDisabled]: {
		message: "Registration is currently disabled.",
		action: "Please contact the administrator for assistance.",
	},
};

export function getErrorMessage(errorCode: ErrorCode): string {
	const errorDetails = ErrorMessages[errorCode];
	return errorDetails
		? `${errorDetails.message} ${errorDetails.action || ""}`.trim()
		: "An unexpected error occurred.";
}
