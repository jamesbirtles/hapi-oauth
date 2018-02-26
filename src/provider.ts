import * as Hapi from 'hapi';
import * as qs from 'querystring';
import * as Boom from 'boom';
import * as Wreck from 'wreck';

import { PluginOptions } from './plugin';
import { Profile } from './profile';

export type Scopes =
    | string[]
    | ((provider: string, req: Hapi.Request) => string[]);
export interface AccessTokens {
    access_token: string;
    refresh_token: string;
}

export abstract class Provider {
    name: string;
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    authUrl: string;
    scopes: Scopes;

    serialiseScopes(req: Hapi.Request) {
        if (!this.scopes || this.scopes.length === 0) {
            return undefined;
        }

        return this.getScopes(req).join(' ');
    }

    getScopes(req: Hapi.Request): string[] {
        if (typeof this.scopes === 'function') {
            return this.scopes(this.name, req);
        }

        return this.scopes;
    }

    compileAuthUrl(
        req: Hapi.Request,
        options: PluginOptions,
        redirectUri: string,
    ) {
        const query = {
            response_type: 'code',
            redirect_uri: redirectUri,
            client_id: this.clientId,
        };

        const scopes = this.serialiseScopes(req);
        if (scopes) {
            query['scope'] = scopes;
        }

        return options.handler
            .preAuthUrl(query, this, req)
            .then(() => `${this.authUrl}?${qs.stringify(query)}`);
    }

    requestToken(code: string, redirect_uri: string) {
        return new Promise((resolve, reject) => {
            Wreck.post(
                this.tokenUrl,
                {
                    json: true,
                    payload: {
                        code,
                        redirect_uri,
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'authorization_code',
                    },
                },
                (err, message, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (res.error) {
                        const error = new Error(
                            res.error_description || res.message,
                        );
                        error.name = res.error;
                        reject(error);
                        return;
                    }

                    resolve(res);
                },
            );
        });
    }

    extractCode(req: Hapi.Request) {
        return req.query['code'];
    }

    async handleCode(
        request: Hapi.Request,
        options: PluginOptions,
        redirectUri: string,
    ) {
        const code = this.extractCode(request);

        if (!code) {
            throw Boom.unauthorized('Missing code');
        }

        return this.requestToken(code, redirectUri).then(
            data => options.handler.onLink({ provider: this, data }, request),
            error =>
                options.handler.onError({ provider: this, error }, request),
        );
    }

    /*abstract*/ getProfile(tokens: AccessTokens): Promise<Profile> {
        throw new Error('Not implemented');
    }
}

export function registerProvider(
    server: Hapi.Server,
    options: PluginOptions,
    provider: Provider,
) {
    const redirectUri = `${options.baseUrl}/oauth/${provider.name}`;

    server.route({
        method: 'GET',
        path: `/oauth/${provider.name}/request`,
        options: options.requestConfig,
        handler: function(request, reply) {
            return provider
                .compileAuthUrl(request, options, redirectUri)
                .then(url => ({ url }));
        },
    });

    server.route({
        method: 'GET',
        path: `/oauth/${provider.name}`,
        options: options.linkConfig,
        handler: function(request, reply) {
            return provider.handleCode(request, options, redirectUri);
        },
    });
}
