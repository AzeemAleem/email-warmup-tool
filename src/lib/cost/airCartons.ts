/**
 * Air freight carton options for volumetric shipping.
 * billedKg = max fill capacity (25 kg carton → 22 kg product).
 * labeledKg = carton rating used for chargeable billing (× cartons).
 */

export interface AirCartonOption {
  id: string;
  /** Display label, e.g. "25 kg" */
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** Nominal carton rating from carrier */
  labeledKg: number;
  /** Chargeable / max fill kg used for billing */
  billedKg: number;
}

/** Default catalog — billed kg uses ~12% safety vs labeled (25→22). */
export const DEFAULT_AIR_CARTONS: readonly AirCartonOption[] = [
  {
    id: "25kg",
    label: "25 kg",
    lengthIn: 21,
    widthIn: 17,
    heightIn: 16,
    labeledKg: 25,
    billedKg: 22,
  },
  {
    id: "20kg",
    label: "20 kg",
    lengthIn: 18.9,
    widthIn: 15.7,
    heightIn: 15.4,
    labeledKg: 20,
    billedKg: 18,
  },
  {
    id: "15kg",
    label: "15 kg",
    lengthIn: 16.5,
    widthIn: 14.2,
    heightIn: 14.6,
    labeledKg: 15,
    billedKg: 13,
  },
  {
    id: "10kg",
    label: "10 kg",
    lengthIn: 13.4,
    widthIn: 12.6,
    heightIn: 13.8,
    labeledKg: 10,
    billedKg: 9,
  },
  {
    id: "5kg",
    label: "5 kg",
    lengthIn: 13.4,
    widthIn: 12.6,
    heightIn: 7.1,
    labeledKg: 5,
    billedKg: 4.5,
  },
  {
    id: "2_5kg",
    label: "2.5 kg",
    lengthIn: 13.4,
    widthIn: 12.6,
    heightIn: 3.5,
    labeledKg: 2.5,
    billedKg: 2.2,
  },
  {
    id: "1_5kg",
    label: "1.5 kg",
    lengthIn: 13.4,
    widthIn: 7.1,
    heightIn: 3.1,
    labeledKg: 1.5,
    billedKg: 1.3,
  },
] as const;
