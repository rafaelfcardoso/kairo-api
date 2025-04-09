# Apple Authentication Setup Guide

This document explains how to set up Apple Sign In with Zenith API.

## Requirements

To implement Apple Sign In, you'll need:

1. An Apple Developer account
2. A registered App ID with Apple Sign In enabled
3. A Services ID configured for web authentication
4. A private key for client authentication

## Configuration Steps

### 1. Register an App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Create a new App ID (if you don't have one already)
3. Enable "Sign In with Apple" capability

### 2. Create a Services ID for Web Authentication

1. In the Identifiers section, create a new Services ID
2. Associate it with your App ID
3. Configure the domains and return URLs for your application
   - Add your domain (e.g., `yourapp.com`)
   - Add your return URL (e.g., `https://yourapp.com/auth/apple/callback`)

### 3. Create a Private Key

1. In the Keys section, create a new key
2. Enable "Sign In with Apple"
3. Associate it with your App ID
4. Download the key (you can only do this once)

### 4. Configuration in .env file

Add the following environment variables to your `.env` file:

```
# Apple Authentication
APPLE_CLIENT_ID=your.services.id
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=/path/to/your/AuthKey_KEYID.p8
APPLE_CALLBACK_URL=https://yourapp.com/auth/apple/callback
FRONTEND_URL=https://yourapp.com
```

## Usage

### Backend Endpoints

- **GET /auth/apple**: Initiates Apple Sign In flow
- **GET /auth/apple/callback**: Callback endpoint for Apple Sign In

### Frontend Integration

To implement Apple Sign In button on your frontend:

1. Use Apple's official JS library:

```html
<script
  type="text/javascript"
  src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
></script>
```

2. Configure sign-in button:

```html
<div
  id="appleid-signin"
  data-color="black"
  data-border="true"
  data-type="sign in"
></div>
```

3. Initialize Apple Sign In:

```javascript
AppleID.auth.init({
  clientId: 'your.services.id',
  scope: 'name email',
  redirectURI: 'https://yourapp.com/auth/apple/callback',
  usePopup: false,
});
```

## Troubleshooting

- **Invalid Key**: Ensure the private key file is accessible and has the correct permissions
- **Authentication Failed**: Verify that your Services ID, callback URL, and domain settings match
- **Missing User Info**: Apple only sends user information on the first login, handle this case appropriately

## Additional Resources

- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/get-started/)
- [Implementing User Authentication with Sign in with Apple](https://developer.apple.com/documentation/authenticationservices/implementing_user_authentication_with_sign_in_with_apple)
