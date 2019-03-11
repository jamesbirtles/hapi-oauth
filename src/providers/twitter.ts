import * as Boom from 'boom';
import * as Hapi from 'hapi';
import { OAuth } from 'oauth';
import * as qs from 'querystring';

import { PluginOptions } from '../plugin';
import { Profile } from '../profile';
import { AccessTokens, Provider, Scopes } from '../provider';

export class TwitterProfile implements Profile {
    public created_at: string;
    public description: string;
    public favourites_count: number;
    public followers_count: number;
    public friends_count: number;
    public geo_enabled: boolean;
    public id: number;
    public id_str: string;
    public lang: string;
    public location: string;
    public name: string;
    public protected: boolean;
    public screen_name: string;
    public statuses_count: number;
    public time_zone: string;
    public verified: boolean;

    constructor(profile: any) {
        Object.assign(this, profile);
    }

    public getUniqueId() {
        return this.id_str;
    }
}

export class TwitterProvider extends Provider {
    public name = 'twitter';
    public requestUrl = 'https://api.twitter.com/oauth/request_token';
    public authUrl = 'https://twitter.com/oauth/authenticate';
    public tokenUrl = 'https://twitter.com/oauth/access_token';
    public profileUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';

    private oauth: OAuth = null;
    private store: { [ requestCode: string ]: {
        secret: string;
        state?: string;
    }} = {};

    constructor(
        public clientId: string,
        public clientSecret: string,
        public scopes: Scopes = [],
        public redirectUri: string
    ) {
        super();

        this.oauth = new OAuth(this.requestUrl, this.tokenUrl, this.clientId, this.clientSecret, '1.0A', redirectUri, 'HMAC-SHA1');
    }

    public async compileAuthUrl(
        req: Hapi.Request,
        options: PluginOptions
    ) {
        return new Promise<string>((resolve, reject) => {
            this.oauth.getOAuthRequestToken({ x_auth_access_type: 'write' }, async (err, token, secret) => {
                if (err) {
                    reject(Boom.badRequest('Failed to get a request token'));

                    return;
                }
                const query = {
                    oauth_token: token
                };
                this.store[token] = { secret };

                return options.handler
                    .preAuthUrl(query, this, req)
                    .then(() => this.store[token].state = query['state'])
                    .then(() => resolve(`${this.authUrl}?${qs.stringify(query)}`))
                    .catch(err => {
                        delete this.store[token];

                        return err;
                    });
            });
        });
    }

    public extractCode(req: Hapi.Request) {
        req.query['state'] = this.store[req.query['oauth_token']].state;

        return req.query['oauth_token'];
    }

    public requestToken(code: string, _redirect_uri: string, req: Hapi.Request) {
        return new Promise((resolve, reject) => {
            const data = this.store[code];
            if (data == null) {
                reject(Boom.badRequest('Request data missing'));
                delete this.store[code];

                return;
            }
            this.oauth.getOAuthAccessToken(code, data.secret, req.query['oauth_verifier'], (err, token, secret) => {
                delete this.store[token];

                if (err) {
                    reject(Boom.badRequest('Failed to get an access token'));

                    return;
                }

                resolve({
                    access_token: token,
                    secret_token: secret
                });
            });
        });
    }


    public getProfile(tokens: AccessTokens): Promise<TwitterProfile> {
        return new Promise((resolve, reject) => {
            this.oauth.get(this.profileUrl, tokens.access_token, tokens['secret_token'], (err, res: any) => {
                if (err) {
                    reject(err);

                    return;
                }
                if (res.errors != null) {
                    reject(res.errors);

                    return;
                }
                
                resolve(new TwitterProfile(JSON.parse(res)));
            });
        });
    }
}