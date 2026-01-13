export type CardType = 'door' | 'treasure';
export type SubType = 'monster' | 'curse' | 'race' | 'class' | 'item' | 'modifier' | 'other';

export interface Card {
    id: string;
    name: string;
    type: CardType;
    subType: SubType;
    description: string;
    image?: string;
}

export interface MonsterCard extends Card {
    subType: 'monster';
    level: number;
    treasure: number;
    badStuff: string;
    badStuffEffect: any; // Simplified for backend
    levelReward: number;
}

export interface ItemCard extends Card {
    subType: 'item';
    bonus: number;
    goldValue: number;
    slot?: 'head' | 'body' | 'hand' | 'foot' | 'big';
    usedBy?: string[];
}

export type GameCard = MonsterCard | ItemCard | Card;

export const DOOR_DECK: GameCard[] = [
    {
        id: 'm1',
        name: 'Gulyabani',
        type: 'door',
        subType: 'monster',
        description: 'Sadece süt kardeşler onu kızdırabilir.',
        level: 10,
        treasure: 2,
        levelReward: 1,
        badStuff: 'Seni çuvala koyup götürür.',
        badStuffEffect: null,
    } as any,
    {
        id: 'm2',
        name: 'Trafik Canavarı',
        type: 'door',
        subType: 'monster',
        description: 'Kornaya basıp duruyor.',
        level: 16,
        treasure: 4,
        levelReward: 2,
        badStuff: 'Ezildin. 1 seviye kaybedersin.',
        badStuffEffect: null,
    } as any,
    {
        id: 'c1',
        name: 'Nazar Değdi',
        type: 'door',
        subType: 'curse',
        description: 'En iyi eşyan kırıldı.',
        image: '',
    } as any,
];

export const TREASURE_DECK: GameCard[] = [
    {
        id: 'i1',
        name: 'Islak Odun',
        type: 'treasure',
        subType: 'item',
        description: 'Efsanevi dayak aleti.',
        bonus: 3,
        goldValue: 400,
        slot: 'hand',
    } as any,
    {
        id: 'i2',
        name: 'Anne Terliği',
        type: 'treasure',
        subType: 'item',
        description: 'Isabet oranı %100.',
        bonus: 5,
        goldValue: 600,
        slot: 'hand',
    } as any,
];
