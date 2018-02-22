import * as Boom from "boom";
import { Request } from "hapi";

import { Provider } from "./provider";

export interface LinkSuccess {
    provider: Provider;
    data: any;
}

export interface LinkError {
    provider: Provider;
    error: any;
}

export class OAuthHandler {
    public async onLink(res: LinkSuccess, request: Request): Promise<any> {
        return res.data;
    }

    public async onError(res: LinkError, request: Request): Promise<any> {
        throw Boom.badImplementation(res.error);
    }

    public async preAuthUrl(
        query: any,
        provider: Provider,
        request: Request,
    ): Promise<void> {}
}
