export type CardType = 'door' | 'treasure';
export type SubType = 'monster' | 'curse' | 'race' | 'class' | 'item' | 'modifier' | 'blessing' | 'other';

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

export interface RaceCard extends Card {
    subType: 'race';
    abilities: string[];
}

export interface ClassCard extends Card {
    subType: 'class';
    abilities: string[];
}

export interface CurseCard extends Card {
    subType: 'curse';
    effect: string; // Description of effect
}

export interface BlessingCard extends Card {
    subType: 'blessing';
    effect: string;
}

export type GameCard = MonsterCard | ItemCard | RaceCard | ClassCard | CurseCard | BlessingCard | Card;

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
        effect: 'Lose best item',
    } as CurseCard,
    {
        id: 'r1',
        name: 'Elf',
        type: 'door',
        subType: 'race',
        description: 'Kaçarken +1 alırsın.',
        abilities: ['Run away bonus'],
    } as RaceCard,
    {
        id: 'cl1',
        name: 'Savaşçı',
        type: 'door',
        subType: 'class',
        description: 'Savaşta +1 bonus.',
        abilities: ['Combat bonus'],
    } as ClassCard,
    {
        id: 'm_bedevi',
        name: 'Bahtsız Bedevi',
        type: 'door',
        subType: 'monster',
        description: 'Çölde kutup ayısı ile karşılaşmış.',
        level: 1,
        treasure: 1,
        levelReward: 1,
        badStuff: '1 Seviye Kaybedersin.',
        badStuffEffect: null,
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
    {
        id: 'b1',
        name: 'Şans Meleği',
        type: 'treasure',
        subType: 'blessing',
        description: 'Bir sonraki zarı tekrar at.',
        effect: 'Reroll dice',
    } as BlessingCard,
];
