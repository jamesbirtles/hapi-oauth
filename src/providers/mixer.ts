import fetch from 'node-fetch';

import { Provider, Scopes, AccessTokens } from '../provider';
import { Profile } from '../profile';

export class MixerProfile implements Profile {
    public id: number;
    public username: string;
    public email: string;
    public verified: boolean;
    public experience: number;
    public sparks: number;
    public level: number;
    public bio: string;
    public primaryTeam: number;
    public frontendVersion?: string;
    public createdAt: string;
    public updatedAt: string;
    public deletedAt: string;

    constructor(profile: any) {
        Object.assign(this, profile);
    }

    public getUniqueId() {
        return this.id;
    }
}

export class BeamProvider extends Provider {
    public name = 'mixer';
    public tokenUrl = 'https://mixer.com/api/v1/oauth/token';
    public authUrl = 'https://mixer.com/oauth/authorize';
    public profileUrl = 'https://mixer.com/api/v1/users/current';

    constructor(public clientId: string, public clientSecret: string, public scopes: Scopes) {
        super();
    }

    public getProfile(tokens: AccessTokens): Promise<MixerProfile> {
        return fetch(this.profileUrl, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            }
        })
        .then(res => res.json())
        .then(profile => new MixerProfile(profile));
    }
}
