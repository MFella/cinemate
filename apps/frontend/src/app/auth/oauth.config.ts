import { AuthConfig } from "angular-oauth2-oidc";

type IdentityProvider = 'google' | 'facebook';
const cachedAuthConfig = new Map<IdentityProvider, AuthConfig>();

export function getAuthConfig(identityProvider: IdentityProvider, isPlatformBrowser: boolean = false): AuthConfig | undefined {
    if (!isPlatformBrowser) {
        return;
    }

    return retrieveAuthConfig(identityProvider);
}

const retrieveAuthConfig = (identityProvider: IdentityProvider): AuthConfig => {
    if (cachedAuthConfig.has(identityProvider)) {
        return cachedAuthConfig.get(identityProvider)!;
    }

    const authConfig: AuthConfig = {
        // Url of the Identity Provider
        issuer: 'https://accounts.google.com',
        // URL of the SPA to redirect the user to after login
        redirectUri: 'http://localhost:4200/',
    
        // The SPA's id. The SPA is registerd with this id at the auth-server
        clientId:
        '786909648856-9rd21umil6u2hlql2rmf82t422kir0je.apps.googleusercontent.com',
    
        strictDiscoveryDocumentValidation: false,
    
        // set the scope for the permissions the client should request
        // The first three are defined by OIDC. The 4th is a usecase-specific one
        scope: 'openid profile email',
    
        showDebugInformation: true,
    
        sessionChecksEnabled: true,
    };

    cachedAuthConfig.set(identityProvider, authConfig);

    return authConfig;
}