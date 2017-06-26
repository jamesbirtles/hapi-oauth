import * as Boom from 'boom';
import { Request, ReplyNoContinue } from 'hapi';

import { Provider } from './provider';

export interface LinkSuccess {
    provider: Provider;
    data: any;
}

export interface LinkError {
    provider: Provider;
    error: any;
}

export class OAuthHandler {
    public onLink(res: LinkSuccess, request: Request, reply: ReplyNoContinue): void {
        reply(res.data);
    }

    public onError(res: LinkError, request: Request, reply: ReplyNoContinue): void {
        reply(Boom.badImplementation(res.error));
    }

    public preAuthUrl(query: any, provider: Provider, request: Request): Promise<void> {
        return Promise.resolve();
    }
}
