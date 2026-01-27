import { Locale } from '../generated/prisma/enums';
import { Api } from './api/mh-api';
import { prisma } from './prisma';

export const getUser = async (api: Api<unknown>, id: number) => {
  let user = await prisma.user.findUnique({
    where: { id },
  });

  if (user) {
    return user;
  }

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
    },
  });

  return user;
};
