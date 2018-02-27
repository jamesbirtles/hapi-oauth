import * as Hapi from 'hapi';
import * as qs from 'querystring';
import * as Boom from 'boom';
import fetch from 'node-fetch';

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
    query: { [index: string]: any } = {};
    encoding = 'application/json';

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
            ...this.query,
        };

        const scopes = this.serialiseScopes(req);
        if (scopes) {
            query['scope'] = scopes;
        }

        return options.handler
            .preAuthUrl(query, this, req)
            .then(() => `${this.authUrl}?${qs.stringify(query)}`);
    }

    async requestToken(code: string, redirect_uri: string) {
        const payload = {
            code,
            redirect_uri,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'authorization_code',
        };

        let body: string;
        switch (this.encoding) {
            case 'application/json':
                body = JSON.stringify(payload);
                break;
            case 'application/x-www-form-urlencoded':
                body = qs.stringify(payload);
                break;
            default:
                throw new Error(`Unknown encoding type: ${this.encoding}`);
        }

        return fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': this.encoding,
            },
            body,
        }).then(async res => {
            if (res.status < 200 || res.status >= 300) {
                throw new Error(`unexpected response code ${res.status}`);
            }

            return res.json();
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
