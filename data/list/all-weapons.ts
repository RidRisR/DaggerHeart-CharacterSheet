import { primaryWeapons, Weapon } from "./primary-weapon";
import { secondaryWeapons } from "./secondary-weapon";

export type AllWeapon = Weapon & {
    weaponType: "primary" | "secondary";
}

export const allWeapons: AllWeapon[] = [
    ...primaryWeapons.map((weapon) => ({
        ...weapon,
        weaponType: "primary" as const,
    })),
    ...secondaryWeapons.map((weapon) => ({
        ...weapon,
        weaponType: "secondary" as const,
    })),
];
