import { Api } from './mh-api.js';

/**
 * Creates and configures a new MyHordes API instance with the provided userkey
 */
export const createMHApi = (userkey: string): Api<unknown> => {
  const api = new Api({
    baseUrl: 'https://myhordes.eu/api/x',
  });

  api.setSecurityData({
    appkey: process.env.API_APPKEY,
    userkey,
  });

  return api;
};
