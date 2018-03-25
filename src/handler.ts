import * as Boom from 'boom';
import { Request, ResponseToolkit } from 'hapi';

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
    public async onLink(res: LinkSuccess, h: ResponseToolkit): Promise<any> {
        return res.data;
    }

    public async onError(res: LinkError, h: ResponseToolkit): Promise<any> {
        throw Boom.badImplementation(res.error);
    }

    public async preAuthUrl(
        query: any,
        provider: Provider,
        request: Request,
    ): Promise<void> {}
}
