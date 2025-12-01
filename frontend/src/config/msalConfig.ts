import { Configuration, LogLevel } from '@azure/msal-browser'

// Azure AD App Registration details
const clientId = '5ea54484-4d5e-4cad-ad73-d9b5e3a510e4'
const tenantId = '5819bf52-bdaf-4bd7-998c-f2454ad0a2e1'

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            break
          case LogLevel.Warning:
            console.warn(message)
            break
          case LogLevel.Info:
            console.info(message)
            break
          case LogLevel.Verbose:
            console.debug(message)
            break
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
}

// Scopes for Microsoft Graph API - OneDrive file operations
export const graphScopes = {
  oneDrive: ['Files.ReadWrite', 'User.Read'],
}

// Microsoft Graph API endpoint
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphDriveEndpoint: 'https://graph.microsoft.com/v1.0/me/drive',
}
