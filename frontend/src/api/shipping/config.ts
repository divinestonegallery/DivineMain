// @ts-nocheck
export type ShiprocketConfiguration = {
  apiBaseUrl: string;
  apiToken: string | null;
  apiEmail: string | null;
  apiPassword: string | null;
  originPostalCode: string;
};

export function getShiprocketConfiguration(): ShiprocketConfiguration | null {
  const apiToken = process.env.SHIPROCKET_API_TOKEN?.trim() || null;
  const apiEmail = process.env.SHIPROCKET_API_EMAIL?.trim() || null;
  const apiPassword = process.env.SHIPROCKET_API_PASSWORD?.trim() || null;
  const originPostalCode = process.env.SHIPROCKET_PICKUP_POSTCODE?.trim() || "";
  if (!/^[1-9]\d{5}$/.test(originPostalCode)) return null;
  if (!apiToken && (!apiEmail || !apiPassword)) return null;
  return {
    apiBaseUrl: "https://apiv2.shiprocket.in/v1/external",
    apiToken,
    apiEmail,
    apiPassword,
    originPostalCode,
  };
}
