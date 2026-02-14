import { Locale } from '../generated/prisma/enums.js';
import { checkApiAvailability } from './api/mh-api.helper.js';
import { Api } from './api/mh-api.js';
import { prisma } from './prisma.js';

export const createUser = async (api: Api<unknown>, id: number, key: string) => {
  let user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (user) {
    return user;
  }

  await checkApiAvailability(api);

  // Fetch user from MyHordes API
  const { data } = await api.json.getJson({
    fields: 'id,twinId,etwinId,name,locale,avatar',
  });

  if (!data.id) {
    throw new Error('User not found in MyHordes API');
  }

  // Parse API data
  const locale =
    data.locale && Object.values(Locale).includes(data.locale as Locale) ? (data.locale as Locale) : Locale.EN;

  // Create user in the database
  user = await prisma.user.create({
    data: {
      id: data.id,
      twinoidId: data.twinId,
      etwinId: data.etwinId,
      name: data.name ?? 'Unknown',
      locale,
      avatar: data.avatar,
      key,
    },
    select: { id: true },
  });

  return user;
};
