import Dexie, { type Table } from 'dexie';
import type { BikeConfig } from '../kinematics/types';

export interface SavedBike {
  id: string;
  name: string;
  suspensionType: string;
  config: BikeConfig;
  imageBlob: Blob;
  thumb: string; // small data-URL JPEG
  savedAt: number;
}

class Db extends Dexie {
  bikes!: Table<SavedBike>;
  constructor() {
    super('linkage-lab');
    this.version(1).stores({ bikes: 'id, name, suspensionType, savedAt' });
  }
}

export const db = new Db();
