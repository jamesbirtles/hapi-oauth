import { Provider, Scopes } from '../provider';

export class TwitchProvider extends Provider {
    public name = 'twitch';
    public tokenUrl = 'https://api.twitch.tv/kraken/oauth2/token';
    public authUrl = 'https://api.twitch.tv/kraken/oauth2/authorize';

    constructor(public clientId: string, public clientSecret: string, public scopes: Scopes) {
        super();
    }
}
