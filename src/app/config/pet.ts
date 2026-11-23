import { createPetCardPlay, createPetClient } from '@/infrastructure/pet';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
const token = () => vault.read();
const onExpired = () => {
  void authController.restore(true);
};
export const petCardCollection = createPetCardPlay(apiBaseUrl, token, onExpired);
export const petService = createPetClient(apiBaseUrl, token, onExpired);
