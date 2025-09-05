import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface IHttpRequestOptions {
  timeoutMs?: number; // 请求超时
  retry?: number; // 重试次数（失败后再试的次数）
  headers?: Record<string, string>; // 额外请求头
}

@Injectable()
export class HttpClientService implements OnModuleInit {
  constructor(private readonly http: HttpService) {}

  public onModuleInit(): void {
    const axios = this.http.axiosRef;
    // 请求拦截：设置默认头/超时（如调用方未指定）
    axios.interceptors.request.use((config) => {
      if (config.timeout == null) config.timeout = 5000;
      return config;
    });
    // 响应拦截：统一错误消息与超时错误
    axios.interceptors.response.use(
      (resp) => resp,
      (error) => {
        if (error?.code === 'ECONNABORTED') {
          return Promise.reject(new Error('Request timeout'));
        }
        const status = error?.response?.status;
        if (status) {
          const data = error?.response?.data;
          const text = typeof data === 'string' ? data : JSON.stringify(data ?? {});
          return Promise.reject(new Error(`HTTP ${status}: ${text}`));
        }
        return Promise.reject(error);
      },
    );
  }

  public async getJson<T = unknown>(url: string, options: IHttpRequestOptions = {}): Promise<T> {
    return await this.requestJson<T>('GET', url, undefined, options);
  }

  public async postJson<T = unknown>(
    url: string,
    body: unknown,
    options: IHttpRequestOptions = {},
  ): Promise<T> {
    return await this.requestJson<T>('POST', url, body, options);
  }

  private async requestJson<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
    options: IHttpRequestOptions = {},
  ): Promise<T> {
    const { timeoutMs = 5000, retry = 0, headers = {} } = options;

    const tryOnce = async (): Promise<T> => {
      const resp = await lastValueFrom(
        this.http.request<T>({
          method,
          url,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
          data: body,
          timeout: timeoutMs,
          validateStatus: () => true,
        }),
      );
      const status = resp.status ?? 0;
      if (status < 200 || status >= 300) {
        const text = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data ?? {});
        throw new Error(`HTTP ${status}: ${text}`);
      }
      return resp.data as T;
    };

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await tryOnce();
      } catch (err) {
        if (attempt >= retry) throw err;
      }
    }
  }
}
