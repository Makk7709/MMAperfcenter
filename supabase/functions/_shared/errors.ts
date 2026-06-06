/**
 * Extrait un message lisible d'une valeur d'erreur de type inconnu, sans
 * recourir à la coercition de chaîne par défaut d'un objet (qui produirait
 * "[object Object]").
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error) ?? "Unknown error";
}
