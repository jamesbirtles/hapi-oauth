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

    requestToken(code: string, redirect_uri: string) {
        const payload = {
            code,
            redirect_uri,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'authorization_code',
        };

        return this.sendTokenRequest(payload);
    }

    refreshToken(
        refresh_token: string,
    ): Promise<{ access_token: string; refresh_token?: string }> {
        const payload = {
            refresh_token,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
        };

        return this.sendTokenRequest(payload);
    }

    async sendTokenRequest(payload: object) {
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

    async handleCode(
        h: Hapi.ResponseToolkit,
        options: PluginOptions,
        redirectUri: string,
    ) {
        const error = this.getCodeError(h.request as Hapi.Request);
        if (error) {
            return options.handler.onError({ provider: this, error }, h);
        }

        const code = this.extractCode(h.request as Hapi.Request);
        if (!code) {
            return options.handler.onError(
                {
                    provider: this,
                    error: new CodeError(CodeError.Kind.Missing),
                },
                h,
            );
        }

        return this.requestToken(code, redirectUri).then(
            data => options.handler.onLink({ provider: this, data }, h),
            error => options.handler.onError({ provider: this, error }, h),
        );
    }

    extractCode(req: Hapi.Request) {
        return req.query['code'];
    }

    getCodeError(req: Hapi.Request): CodeError | null {
        const err = req.query['error'];
        if (err === null) {
            return null;
        }

        switch (err) {
            case 'access_denied':
                return new CodeError(CodeError.Kind.Denied);
            default:
                return new CodeError(CodeError.Kind.Unknown);
        }
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
        handler: function(request) {
            return provider
                .compileAuthUrl(request, options, redirectUri)
                .then(url => ({ url }));
        },
    });

    server.route({
        method: 'GET',
        path: `/oauth/${provider.name}`,
        options: options.linkConfig,
        handler: function(request, h) {
            return provider.handleCode(h, options, redirectUri);
        },
    });
}

export class CodeError extends Error {
    constructor(public kind: CodeError.Kind) {
        super(kind);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export namespace CodeError {
    export enum Kind {
        Denied = 'Request denied by user',
        Missing = 'Code not found in request',
        Unknown = 'Unknown error returned from provider',
    }
}
