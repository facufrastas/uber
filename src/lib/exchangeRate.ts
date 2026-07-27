// Cars are bought in USD while every shift and expense is in ARS, so the
// payoff progress needs a rate. DolarAPI is public, free and CORS-enabled,
// so the browser can call it directly — no backend endpoint, no key.
const DOLAR_OFICIAL_URL = 'https://dolarapi.com/v1/dolares/oficial';

interface DolarResponse {
  venta: number;
  compra: number;
}

// "venta" (sell) is the rate you'd pay to buy dollars: the right one to value
// a debt denominated in USD.
export async function fetchDolarOficial(): Promise<number> {
  const response = await fetch(DOLAR_OFICIAL_URL);

  if (!response.ok) throw new Error(`DolarAPI responded ${response.status}`);

  const { venta } = (await response.json()) as DolarResponse;

  if (!venta || Number.isNaN(venta)) throw new Error('DolarAPI returned no rate');

  return venta;
}
