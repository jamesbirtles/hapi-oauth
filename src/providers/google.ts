import fetch from 'node-fetch';

import { Provider, Scopes, AccessTokens } from '../provider';
import { Profile } from '../profile';

export class GoogleProfile implements Profile {
    public id: number;
    public name: string;
    public email: string;

    constructor(profile: any) {
        Object.assign(this, profile);
    }

    public getUniqueId() {
        return this.id;
    }
}

export class GoogleProvider extends Provider {
    public name = 'google';
    public tokenUrl = 'https://www.googleapis.com/oauth2/v4/token';
    public authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    public profileUrl = 'https://www.googleapis.com/oauth2/v1/userinfo';
    constructor(
        public clientId: string,
        public clientSecret: string,
        public scopes: Scopes,
    ) {
        super();

        this.encoding = 'application/x-www-form-urlencoded';
        this.query = {
            // Offline allows refreshing when the user isn't present
            access_type: 'offline',
        };
    }

    public getProfile(tokens: AccessTokens): Promise<GoogleProfile> {
        return fetch(this.profileUrl, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        })
            .then(res => res.json())
            .then(profile => new GoogleProfile(profile));
    }
}
