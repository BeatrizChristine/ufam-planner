function nameParts(value: string): string[] {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** A profile may use an abbreviated full name, but one matching first name is inconclusive. */
export function namesCompatible(accountName: string, documentName: string): boolean {
  const account = nameParts(accountName);
  const document = nameParts(documentName);
  if (account.length < 2 || document.length < 2) return account.join(" ") === document.join(" ");

  let next = 0;
  for (const part of account) {
    const found = document.indexOf(part, next);
    if (found === -1) return false;
    next = found + 1;
  }
  return true;
}
