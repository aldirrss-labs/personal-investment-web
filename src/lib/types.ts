export type Tx = { ticker: string; qty: number; price: number };
export type Position = {
  ticker: string;
  qty: number;
  avgCost: number;
  costBasis: number;
};
