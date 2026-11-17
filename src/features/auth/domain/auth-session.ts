export const appRoles = ['admin', 'supervisor', 'collector', 'resident'] as const;

export type AppRole = (typeof appRoles)[number];

export type AuthPrincipal = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: AppRole;
  divisionIds: string[];
};

export type AuthFailureKind =
  | 'configuration'
  | 'invalid-credentials'
  | 'invalid-role'
  | 'network'
  | 'provider-disabled'
  | 'verification-email'
  | 'unknown';

export type AuthFailure = {
  kind: AuthFailureKind;
  message: string;
};

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; principal: AuthPrincipal }
  | { status: 'error'; failure: AuthFailure };

export class InvalidRoleClaimsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRoleClaimsError';
  }
}

export function resolveAuthPrincipal(
  uid: string,
  email: string | null,
  emailVerified: boolean,
  claims: Record<string, unknown>
): AuthPrincipal {
  const claimedRole = claims.role;
  const role = claimedRole === undefined ? 'resident' : claimedRole;

  if (!isAppRole(role)) {
    throw new InvalidRoleClaimsError('The account has an unsupported role.');
  }

  const divisionIds =
    role === 'supervisor' ? validateDivisionIds(claims.divisionIds) : [];

  return {
    uid,
    email,
    emailVerified,
    role,
    divisionIds,
  };
}

function validateDivisionIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new InvalidRoleClaimsError(
      'Supervisor access is missing a valid division scope.'
    );
  }

  const uniqueIds = new Set<string>();
  for (const divisionId of value) {
    if (
      typeof divisionId !== 'string'
      || divisionId.length === 0
      || divisionId.length > 64
      || divisionId.includes('/')
    ) {
      throw new InvalidRoleClaimsError(
        'Supervisor access contains an invalid division scope.'
      );
    }
    uniqueIds.add(divisionId);
  }

  return [...uniqueIds];
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string'
    && appRoles.some((validRole) => validRole === value);
}
