import { LOGGER } from '../../context.js';
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
  const status = await api.json.statusList();

  const available = !status.data.attack && !status.data.maintain && !status.error;

  LOGGER.log(`MyHordes API status: ${available ? 'available' : 'unavailable'}`);
  LOGGER.log(JSON.stringify(status.data));

  if (!available) {
    throw new ExpectedError('MyHordes API is currently unavailable', 503);
  }
};
