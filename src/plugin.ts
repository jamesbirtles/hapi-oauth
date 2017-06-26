import * as Hapi from 'hapi';

import { OAuthHandler } from './handler';
import { Provider, registerProvider } from './provider';

export type NextFunc = (err?: any) => void;
export interface Plugin {
    (): void;
    attributes: {
        pkg?: any;
        name?: string;
        version?: string;
    }
}

export interface PluginOptions {
    // onLink: (err: any, payload: any, request: Hapi.Request, reply: Hapi.IReply) => void;
    providers: Provider[];
    baseUrl?: string;
    handler?: OAuthHandler;
    requestConfig?: Hapi.RouteAdditionalConfigurationOptions;
    linkConfig?: Hapi.RouteAdditionalConfigurationOptions;
}

export const register = <Plugin> function (server: Hapi.Server, options: PluginOptions, next: NextFunc) {
    if (!options.providers) {
        throw new Error('Providers array not supplied');
    }

    options.baseUrl = options.baseUrl || server.info.uri;
    options.handler = options.handler || new OAuthHandler();

    options.providers.forEach((provider) => {
        registerProvider(server, options, provider);
    });

    next();
};

register.attributes = {
    name: 'hapi-oauth',
    version: '0.0.0',
};
