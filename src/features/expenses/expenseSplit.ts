import { z } from 'zod';

import type { ExpenseShareInput } from '@/stores/dataStore';
import type { ExpenseShare } from '@/data/types';

// The split of an expense as the dialogs edit it: who paid, and the
// percentage each participant bears. Percentages are the editing unit ("the
// other one pays 50%"), amounts in ARS are what gets stored — see
// ExpenseShare in data/types.

export const NO_PAYER = '__no_payer__'; // Radix Select does not allow value=""

export interface SplitRow {
  ownerId: string;
  percentage: number;
}

export interface SplitValue {
  paidByOwnerId: string; // NO_PAYER when nobody claims the expense
  rows: SplitRow[]; // empty = not split: the payer bears everything
}

export const emptySplit: SplitValue = { paidByOwnerId: NO_PAYER, rows: [] };

// Validated as part of each dialog's schema (both the expense and the
// maintenance form embed a `split` field).
export const splitSchema = z
  .object({
    paidByOwnerId: z.string(),
    rows: z.array(z.object({ ownerId: z.string(), percentage: z.union([z.number(), z.nan()]) })),
  })
  .superRefine((split, ctx) => {
    if (split.rows.length === 0) return;

    if (split.paidByOwnerId === NO_PAYER) {
      ctx.addIssue({ code: 'custom', message: 'Elegí quién pagó para poder repartir el gasto' });

      return;
    }

    if (split.rows.some((r) => r.ownerId === '')) {
      ctx.addIssue({ code: 'custom', message: 'Elegí a todos los participantes' });

      return;
    }

    const ownerIds = split.rows.map((r) => r.ownerId);

    if (new Set(ownerIds).size !== ownerIds.length) {
      ctx.addIssue({ code: 'custom', message: 'Hay un participante repetido' });

      return;
    }

    if (split.rows.some((r) => Number.isNaN(r.percentage) || r.percentage <= 0)) {
      ctx.addIssue({ code: 'custom', message: 'Cada porcentaje debe ser mayor a 0' });

      return;
    }

    const sum = split.rows.reduce((acc, r) => acc + r.percentage, 0);

    // float tolerance, same as the ownership split in CarDialog
    if (Math.abs(sum - 100) > 0.01) {
      ctx.addIssue({ code: 'custom', message: `Los porcentajes deben sumar 100 (ahora suman ${sum.toFixed(2)})` });
    }
  });

const round2 = (value: number) => Math.round(value * 100) / 100;

// Percentages → the ARS amounts that get stored. The last row absorbs the
// rounding leftover so the shares always add up to the expense exactly
// (140k split 3 ways: 46666.67 + 46666.67 + 46666.66).
export function splitToShares(split: SplitValue, amount: number): ExpenseShareInput[] {
  if (split.rows.length === 0) return [];

  const shares = split.rows.map((row) => ({ ownerId: row.ownerId, amount: round2((amount * row.percentage) / 100) }));
  const leftover = round2(amount - shares.reduce((sum, s) => sum + s.amount, 0));

  shares[shares.length - 1].amount = round2(shares[shares.length - 1].amount + leftover);

  return shares.filter((s) => s.amount > 0);
}

// Stored shares → the percentages the dialog shows when editing.
export function sharesToSplit(paidByOwnerId: string | null, shares: ExpenseShare[], amount: number): SplitValue {
  return {
    paidByOwnerId: paidByOwnerId ?? NO_PAYER,
    rows: amount > 0 ? shares.map((s) => ({ ownerId: s.ownerId, percentage: round2((s.amount / amount) * 100) })) : [],
  };
}

// "Split in equal parts": the last row takes the rounding leftover so the
// percentages add up to exactly 100 (7 ways: 14.29 × 6 + 14.26).
export function evenRows(rows: SplitRow[]): SplitRow[] {
  if (rows.length === 0) return rows;

  const each = round2(100 / rows.length);

  return rows.map((row, index) => ({
    ...row,
    percentage: index === rows.length - 1 ? round2(100 - each * (rows.length - 1)) : each,
  }));
}
