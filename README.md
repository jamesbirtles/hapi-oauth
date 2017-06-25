# Hapi oauth

## Usage
```ts
import * as HapiOAuth from 'hapi-oauth';

// ...

class ApiOAuthHandler extends HapiOAuth.OAuthHandler {
    public onLink(res: LinkSuccess, request: Request, reply: IReply): void {
        // Do your stuff
    }
}

server.register({
    register: HapiOAuth,
    options: {
        handler: new ApiOAuthHandler(),
        baseUrl: 'http://localhost:8080',
        requestConfig: {
            // Change request config values here, e.g. adding optional auth (for linking existing accounts for example)
            auth: { mode: 'optional', strategy: 'jwt' }
        },
        providers: [
            new HapiOAuth.BeamProvider(
                'beamClientId',
                'beamClientSecret',
                ['user:details:self' /* add more scopes here */]
            ),
            // Rinse and repeat for other providers.
        ]
    }
});
```
