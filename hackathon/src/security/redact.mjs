// Replace secret material in JSON-serialized payloads, including JSON-escaped forms.
export function redactSecrets(value, secrets = []) {
  let encoded = JSON.stringify(value);
  for (const secret of secrets.filter((item) => typeof item === 'string' && item.length > 0)) {
    encoded = encoded.split(secret).join('[REDACTED]');
    const escaped = JSON.stringify(secret).slice(1, -1);
    if (escaped !== secret) encoded = encoded.split(escaped).join('[REDACTED]');
  }
  return JSON.parse(encoded);
}
