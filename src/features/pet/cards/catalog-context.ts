import { createContext, useContext } from 'react';
import type { PetCardCatalog } from '@/domain/pet';

export const PetCardCatalogContext = createContext<PetCardCatalog | null>(null);

export function usePetCardCatalog() {
  const catalog = useContext(PetCardCatalogContext);
  if (!catalog) throw new Error('Missing pet card catalog provider');
  return catalog;
}
