import * as Hapi from 'hapi';
import * as qs from 'querystring';
import * as Boom from 'boom';
import * as Wreck from 'wreck';

import { PluginOptions } from './plugin';

export type Scopes = string[] | ((provider: string, req: Hapi.Request) => string[]);

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

    compileAuthUrl(req: Hapi.Request, options: PluginOptions, redirectUri: string) {
        const query = {
            response_type: 'code',
            redirect_uri: redirectUri, 
            client_id: this.clientId,
        };

        const scopes = this.serialiseScopes(req);
        if (scopes) {
            query['scope'] = scopes;
        }

        return options.handler.preAuthUrl(query, this, req)
            .then(() => `${this.authUrl}?${qs.stringify(query)}`)
    }

    requestToken(code: string, redirect_uri: string) {
        return new Promise((resolve, reject) => {
            Wreck.post(this.tokenUrl, {
                json: true,
                payload: {
                    code, redirect_uri,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'authorization_code',
                }
            }, (err, message, res) => {
                if (err) {
                    reject(err);
                }

                if (res.error) {
                    const error = new Error(res.error_description);
                    error.name = err.error;
                    reject(error);
                }

                resolve(res);
            });
        })
    }

    extractCode(req: Hapi.Request) {
        return req.query.code;
    }

    handleCode(request: Hapi.Request, options: PluginOptions, redirectUri: string, reply: Hapi.IReply) {
        const code = this.extractCode(request);

        if (!code) {
            reply(Boom.unauthorized('Missing code'));
            return;
        }

        this.requestToken(code, redirectUri)
            .then(
                data => options.handler.onLink({ provider: this, data }, request, reply),
                error => options.handler.onError({ provider: this, error }, request, reply)
            )
    }

    abstract getProfile(tokens: any): Promise<any>;
}

export function registerProvider(server: Hapi.Server, options: PluginOptions, provider: Provider) {
    const redirectUri = `${options.baseUrl}/oauth/${provider.name}`;

    server.route({
        method: 'GET',
        path: `/oauth/${provider.name}/request`,
        config: options.requestConfig,
        handler: function (request, reply) {
            provider.compileAuthUrl(request, options, redirectUri)
                .then(url => reply.redirect(url));
        },
    });

    server.route({
        method: 'GET',
        path: `/oauth/${provider.name}`,
        config: options.linkConfig,
        handler: function (request, reply) {
            provider.handleCode(request, options, redirectUri, reply);
        }
    });
}
