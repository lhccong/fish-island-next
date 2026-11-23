import {
  createBrowserPetCards,
  createPetCardCatalogLoader,
  createPetClient,
} from '@/infrastructure/pet';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
export const petCardCollection = createBrowserPetCards(
  apiBaseUrl.replace(/\/+$/, ''),
  createPetCardCatalogLoader(apiBaseUrl),
);
export const petService = createPetClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
