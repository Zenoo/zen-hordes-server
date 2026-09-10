import { ExpectedError } from '../error.js';
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

export const checkApiAvailability = async (api: Api<unknown>) => {
  // Fetch API status
  const _status = await api.json.statusList();
  const status = _status as typeof _status & { data: { error: boolean } };

  const available = status.data && !status.data.attack && !status.data.maintain && !status.data.error;

  if (!available) {
    throw new ExpectedError('MyHordes API is currently unavailable', 503);
  }
};

export const handleApiErrors = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    if (data.error === 'invalid_userkey') {
      throw new ExpectedError('Invalid userkey provided for MyHordes API', 401);
    }
    if (data.error === 'ApiDisabled') {
      throw new ExpectedError('MyHordes API is disabled for this town', 403);
    }
    if (data.error === 'UnknownMap') {
      // Everyone died
      throw new ExpectedError('This town died already', 410);
    }
    throw new Error(`Error fetching town data from MyHordes API: ${data.error}`);
  }
};
