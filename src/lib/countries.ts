// Países en los que trabaja la plataforma (código ISO 3166-1). Se suman acá sin tocar la base.
export const COUNTRY_CODES = [
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN", "MX", "NI", "PA", "PY", "PE", "PR", "UY", "VE",
  "ES", "PT", "AD", "GB", "IE", "FR", "DE", "IT", "NL", "BE", "CH", "AT", "SE", "DK",
  "US", "CA", "AU", "NZ", "AE", "QA", "SA",
] as const;

export const isCountryCode = (c: string) => (COUNTRY_CODES as readonly string[]).includes(c.toUpperCase());
