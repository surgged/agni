import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: '',
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('agni_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customMutator = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then((res: AxiosResponse<T>) => res.data);

  // @ts-expect-error adding cancel property to promise for Orval compatibility
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export default customMutator;
