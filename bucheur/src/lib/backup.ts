import { Share } from 'react-native';

/** Sur iPhone : la sauvegarde passe par la feuille de partage (Fichiers, AirDrop, e-mail…). */
export const IMPORT_SUPPORTED = false;

export async function saveBackup(json: string): Promise<void> {
  await Share.share({ message: json, title: 'Sauvegarde Bûcheur' }).catch(() => {});
}

export async function pickBackup(): Promise<string | null> {
  return null;
}
