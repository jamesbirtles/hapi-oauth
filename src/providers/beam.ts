import fetch from 'node-fetch';

import { Provider, Scopes } from '../provider';

export interface BeamProfile {

}

export class BeamProvider extends Provider {
    public name = 'beam';
    public tokenUrl = 'https://beam.pro/api/v1/oauth/token';
    public authUrl = 'https://beam.pro/oauth/authorize';
    public profileUrl = 'https://beam.pro/api/v1/users/current';

    constructor(public clientId: string, public clientSecret: string, public scopes: Scopes) {
        super();
    }

    getProfile(tokens: any): Promise<BeamProfile> {
        return fetch(this.profileUrl, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            }
        })
        .then(res => res.json());
    }
}

