/** Sur le web : la sauvegarde est un fichier .json téléchargé, puis rechargé au besoin. */
export const IMPORT_SUPPORTED = true;

export async function saveBackup(json: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bucheur-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ouvre le sélecteur de fichiers ; renvoie le contenu du fichier choisi, ou `null`. */
export function pickBackup(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file
        .text()
        .then(resolve)
        .catch(() => resolve(null));
    };
    input.click();
  });
}
