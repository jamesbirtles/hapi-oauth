import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as Wreck from 'wreck';
import * as qs from 'querystring';

import { Provider, Scopes } from '../provider';
import { PluginOptions } from '../plugin';

export class SmashcastProvider extends Provider {
    public name = 'smashcast';
    public tokenUrl = 'https://api.smashcast.tv/oauth/exchange';
    public authUrl = 'https://api.smashcast.tv/oauth/login';

    private hash: string;

    constructor(public clientId: string, public clientSecret: string) {
        super();

        this.hash = new Buffer(`${clientId} ${clientSecret}`).toString('base64');
    }

    compileAuthUrl(req: Hapi.Request, options: PluginOptions, redirectUri: string) {
        const query = {
            app_token: this.clientId,
        };

        return options.handler.preAuthUrl(query, this, req)
            .then(() => `${this.authUrl}?${qs.stringify(query)}`)
    }

    extractCode(req: Hapi.Request) {
        return req.query['request_token'];
    }

    requestToken(code: string, redirect_uri: string) {
        return new Promise((resolve, reject) => {
            Wreck.post(this.tokenUrl, {
                json: true,
                payload: {
                    request_token: code,
                    app_token: this.clientId,
                    hash: this.hash,
                }
            }, (err, message, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (res instanceof Buffer) {
                    res = res.toString('utf8');
                    try {
                        res = JSON.parse(res);
                    } catch (_) {
                        reject(new Error(res));
                        return;
                    }
                }

                if (res.error) {
                    const error = new Error(res.error_description);
                    error.name = err.error;
                    reject(error);
                    return;
                }

                resolve(res);
            });
        })
    }

    handleCode(request: Hapi.Request, options: PluginOptions, redirectUri: string, reply: Hapi.ReplyNoContinue) {
        if (request.query['authToken']) {
            const data = {
                access_token: request.query['authToken'],
            }

            options.handler.onLink({ provider: this, data }, request, reply);
            return;
        }

        super.handleCode(request, options, redirectUri, reply);
    }
}
