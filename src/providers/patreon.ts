import * as Wreck from 'wreck';
import * as qs from 'querystring';

import { Provider, Scopes } from '../provider';

export class PatreonProvider extends Provider {
    public name = 'patreon';
    public tokenUrl = 'https://api.patreon.com/oauth2/token';
    public authUrl = 'https://www.patreon.com/oauth2/authorize';

    constructor(public clientId: string, public clientSecret: string, public scopes: Scopes = []) {
        super();
    }

    requestToken(code: string, redirect_uri: string) {
        return new Promise((resolve, reject) => {
            const query = {
                code, redirect_uri,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'authorization_code',
            }
            Wreck.post(`${this.tokenUrl}?${qs.stringify(query)}`, {
                json: true
            }, (err, message, res) => {
                if (err) {
                    reject(err);
                    return;
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
}
