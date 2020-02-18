import fetch from "node-fetch";
import { stringify } from "querystring";

import { Provider, Scopes, AccessTokens } from "../provider";
import { Profile } from "../profile";
import { name, version } from "../info";

export class MicrosoftProfile implements Profile {
	public id: string;
	public avatar: string;
	public displayName: string;
	public givenName: string;
	public jobTitle: boolean;
	public mail: string;
	public surname: string;
	public userPrincipalName: string;

	constructor(profile: any) {
		Object.assign(this, profile);
	}

	public getUniqueId() {
		return this.id;
	}
}

export class MicrosoftProvider extends Provider {
	public name = "microsoft";
	private tenant = "common";
	public tokenUrl = `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`;
	public authUrl = `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize`;
	public profileUrl = "https://graph.microsoft.com/v1.0/me/";
	public avatarUrl = "https://graph.microsoft.com/v1.0/me/photo/$value";

	constructor(
		public clientId: string,
		public clientSecret: string,
		public scopes: Scopes = []
	) {
		super();
	}

	public requestToken(code: string, redirect_uri: string) {
		return fetch(this.tokenUrl, {
			method: "POST",
			headers: {
				"Accept-Encoding": "gzip,deflate",
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: stringify({
				code,
				redirect_uri,
				client_id: this.clientId,
				client_secret: this.clientSecret,
				grant_type: "authorization_code"
			}),
			compress: true
		})
			.then(res => res.json())
			.then(token => token);
	}

	public getProfile(tokens: AccessTokens): Promise<MicrosoftProfile> {
		return fetch(this.profileUrl, {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`,
				"Accept-Encoding": "gzip,deflate",
				"User-Agent": `${name} (https://github.com/UnwrittenFun/hapi-oauth, ${version})`
			},
			compress: true
		})
			.then(res => res.json())
			.then(profile => {
				profile.avatar = this.avatarUrl;
				return new MicrosoftProfile(profile);
			});
	}
}
