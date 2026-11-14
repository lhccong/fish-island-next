import { createLandlordsChannel, createLandlordsRanking } from '@/infrastructure/landlords';
import { apiBaseUrl } from '@/app/config/api';
export const landlordsChannel = createLandlordsChannel();
export const landlordsRanking = createLandlordsRanking(apiBaseUrl);
