export const TEST_MODE: boolean;
export const TEST_RUT: string;
export const CAMPAIGN: string;
export const SECTORS: ReadonlyArray<{id: string; name: string}>;
export function validRegistrationRut(value: string, testMode?: boolean): boolean;
export function canShareTestRut(first: string, second: string, testMode?: boolean): boolean;
