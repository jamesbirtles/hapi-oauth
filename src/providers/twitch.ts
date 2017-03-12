import { Provider, Scopes, AccessTokens } from '../provider';
import { Profile } from "../profile";
import fetch from 'node-fetch';

export class TwitchProfile implements Profile {
    public _id: string;
    public bio: string;
    public created_at: string;
    public display_name: string;
    public email: string;
    public email_verified: boolean;
    public logo: string;
    public name: string;
    public partnered: boolean;
    public type: string;
    public updated_at: string;

    constructor(profile: any) {
        Object.assign(this, profile);
    }

    public getUniqueId() {
        return String(this._id);
    }
}

export class TwitchProvider extends Provider {
    public name = 'twitch';
    public tokenUrl = 'https://api.twitch.tv/kraken/oauth2/token';
    public authUrl = 'https://api.twitch.tv/kraken/oauth2/authorize';
    public profileUrl = 'https://api.twitch.tv/kraken/user';

    constructor(public clientId: string, public clientSecret: string, public scopes: Scopes) {
        super();
    }

    public getProfile(tokens: AccessTokens): Promise<TwitchProfile> {
        return fetch(this.profileUrl, {
            headers: {
                Accept: 'application/vnd.twitchtv.v5+json',
                'Client-ID': this.clientId,
                Authorization: `OAuth ${tokens.access_token}`,
            }
        })
        .then(res => res.json())
        .then(profile => new TwitchProfile(profile));
    }
}
