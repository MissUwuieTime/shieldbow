import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import type { Region } from '../types';
import { apiBaseURLs, regionalURLs } from '../util/urls';
import Collection from '@discordjs/collection';
import { ApiError } from './error';

/**
 * A class that handles API requests and rate limits for the RIOT API.
 */
export class ApiHandler {
  private _http: AxiosInstance;
  private _apiBase: string;
  private _regionalBase: string;
  private _region: Region;
  private limits: Collection<Region, Collection<string, Date>>;

  /**
   * Create a new API handler.
   *
   * @param region the region to use for the API requests.
   * @param apiKey your RIOT API key.
   */
  constructor(region: Region, apiKey: string) {
    this._region = region;
    this._apiBase = apiBaseURLs[region];
    this._regionalBase = regionalURLs[region];
    this._http = axios.create({
      headers: {
        'X-Riot-Token': apiKey
      }
    });
    this.limits = new Collection<Region, Collection<string, Date>>();
    this.limits.set(region, new Collection<string, Date>());
  }

  /**
   * Update the regional base URLs for API requests.
   *
   * @param region The new region to make requests to.
   */
  set region(region: Region) {
    this._region = region;
    this._apiBase = apiBaseURLs[region];
    this._regionalBase = regionalURLs[region];
    if (!this.limits.has(region)) this.limits.set(region, new Collection<string, Date>());
  }

  /**
   * Make an API request
   * @param url The path to make the request to.
   * @param options Some options to make the promise rejection messages more meaningful.
   */
  async makeApiRequest(url: string, options: { name: string; params: string; regional: boolean }) {
    const request = `${options.name} (${options.params})`;
    return new Promise<AxiosResponse>(async (resolve, reject) => {
      const requestLimit = this.limits.get(this._region)!.get(options.name);
      if (requestLimit && requestLimit.getTime() > Date.now())
        reject('You are still being rate limited for the request: ' + request);
      else
        try {
          const base = options.regional ? this._regionalBase : this._apiBase;
          const response = await this._http.get(base + url);
          if (response.status === 200) resolve(response);
        } catch (error: any) {
          const { response } = error as AxiosError;
          reject(new ApiError(response!));
        }
    });
  }
}
