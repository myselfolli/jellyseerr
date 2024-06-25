// import rateLimit from 'axios-rate-limit';
import type NodeCache from 'node-cache';

// 5 minute default TTL (in seconds)
const DEFAULT_TTL = 300;

// 10 seconds default rolling buffer (in ms)
const DEFAULT_ROLLING_BUFFER = 10000;

interface ExternalAPIOptions {
  nodeCache?: NodeCache;
  headers?: Record<string, unknown>;
  rateLimit?: {
    maxRPS: number;
    maxRequests: number;
  };
}

class ExternalAPI {
  private baseUrl: string;
  protected params: Record<string, string>;
  protected defaultHeaders: { [key: string]: string };
  private cache?: NodeCache;

  constructor(
    baseUrl: string,
    params: Record<string, string> = {},
    options: ExternalAPIOptions = {}
  ) {
    if (options.rateLimit) {
      // this.axios = rateLimit(this.axios, {
      //   maxRequests: options.rateLimit.maxRequests,
      //   maxRPS: options.rateLimit.maxRPS,
      // });
    }

    this.baseUrl = baseUrl;
    this.params = params;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };
    this.cache = options.nodeCache;
  }

  protected async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    ttl?: number,
    config?: RequestInit
  ): Promise<T> {
    const cacheKey = this.serializeCacheKey(endpoint, {
      ...this.params,
      ...params,
    });
    const cachedItem = this.cache?.get<T>(cacheKey);
    if (cachedItem) {
      return cachedItem;
    }

    const url = this.formatUrl(endpoint, params);
    const response = await fetch(url.href, {
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config?.headers,
      },
    });
    const data = await this.getDataFromResponse(response);

    if (this.cache) {
      this.cache.set(cacheKey, data, ttl ?? DEFAULT_TTL);
    }

    return data;
  }

  protected async post<T>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, string>,
    ttl?: number,
    config?: RequestInit
  ): Promise<T> {
    const cacheKey = this.serializeCacheKey(endpoint, {
      config: { ...this.params, ...params },
      data,
    });
    const cachedItem = this.cache?.get<T>(cacheKey);
    if (cachedItem) {
      return cachedItem;
    }

    const url = this.formatUrl(endpoint, params);
    const response = await fetch(url.href, {
      method: 'POST',
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
    const resData = await this.getDataFromResponse(response);

    if (this.cache) {
      this.cache.set(cacheKey, resData, ttl ?? DEFAULT_TTL);
    }

    return resData;
  }

  protected async put<T>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, string>,
    ttl?: number,
    config?: RequestInit
  ): Promise<T> {
    const cacheKey = this.serializeCacheKey(endpoint, {
      config: { ...this.params, ...params },
      data,
    });
    const cachedItem = this.cache?.get<T>(cacheKey);
    if (cachedItem) {
      return cachedItem;
    }

    const url = this.formatUrl(endpoint, params);
    const response = await fetch(url.href, {
      method: 'PUT',
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
    const resData = await this.getDataFromResponse(response);

    if (this.cache) {
      this.cache.set(cacheKey, resData, ttl ?? DEFAULT_TTL);
    }

    return resData;
  }

  protected async delete<T>(
    endpoint: string,
    params?: Record<string, string>,
    config?: RequestInit
  ): Promise<T> {
    const url = this.formatUrl(endpoint, params);
    const response = await fetch(url.href, {
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config?.headers,
      },
    });
    const data = await this.getDataFromResponse(response);

    return data;
  }

  protected async getRolling<T>(
    endpoint: string,
    params?: Record<string, string>,
    ttl?: number,
    config?: RequestInit,
    overwriteBaseUrl?: string
  ): Promise<T> {
    const cacheKey = this.serializeCacheKey(endpoint, {
      ...this.params,
      ...params,
    });
    const cachedItem = this.cache?.get<T>(cacheKey);

    if (cachedItem) {
      const keyTtl = this.cache?.getTtl(cacheKey) ?? 0;

      // If the item has passed our rolling check, fetch again in background
      if (
        keyTtl - (ttl ?? DEFAULT_TTL) * 1000 <
        Date.now() - DEFAULT_ROLLING_BUFFER
      ) {
        const url = this.formatUrl(endpoint, params, overwriteBaseUrl);
        fetch(url.href, {
          ...config,
          headers: {
            ...this.defaultHeaders,
            ...config?.headers,
          },
        }).then(async (response) => {
          const data = await this.getDataFromResponse(response);
          this.cache?.set(cacheKey, data, ttl ?? DEFAULT_TTL);
        });
      }
      return cachedItem;
    }

    const url = this.formatUrl(endpoint, params, overwriteBaseUrl);
    const response = await fetch(url.href, {
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config?.headers,
      },
    });
    const data = await this.getDataFromResponse(response);

    if (this.cache) {
      this.cache.set(cacheKey, data, ttl ?? DEFAULT_TTL);
    }

    return data;
  }

  private formatUrl(
    endpoint: string,
    params?: Record<string, string>,
    overwriteBaseUrl?: string
  ): URL {
    const baseUrl = overwriteBaseUrl || this.baseUrl;
    const href =
      baseUrl +
      (baseUrl.endsWith('/') ? '' : '/') +
      (endpoint.startsWith('/') ? endpoint.slice(1) : endpoint);
    const url = new URL(href);
    if (params) {
      url.search = new URLSearchParams({
        ...this.params,
        ...params,
      }).toString();
    }
    return url;
  }

  private serializeCacheKey(
    endpoint: string,
    params?: Record<string, unknown>
  ) {
    if (!params) {
      return `${this.baseUrl}${endpoint}`;
    }

    return `${this.baseUrl}${endpoint}${JSON.stringify(params)}`;
  }

  private async getDataFromResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('Content-Type')?.split(';')[0];
    if (contentType === 'application/json') {
      return await response.json();
    } else if (
      contentType === 'application/xml' ||
      contentType === 'text/html' ||
      contentType === 'text/plain'
    ) {
      return await response.text();
    } else {
      try {
        return await response.json();
      } catch {
        return await response.blob();
      }
    }
  }
}

export default ExternalAPI;
