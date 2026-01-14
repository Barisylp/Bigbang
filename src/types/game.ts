export type CardType = 'door' | 'treasure';
export type SubType = 'monster' | 'curse' | 'race' | 'class' | 'item' | 'modifier' | 'blessing' | 'fightspells' | 'other';

export interface Card {
    id: string;
    name: string;
    type: CardType;
    subType: SubType;
    description: string;
    image?: string; // Placeholder for now
}

export interface MonsterCard extends Card {
    subType: 'monster';
    level: number;
    treasure: number; // How many treasures it drops
    badStuff: string; // Text description of bad stuff
    badStuffEffect: (player: any) => void; // Logic for bad stuff (placeholder)
    levelReward: number; // Levels gained on win (usually 1)
}

export interface ItemCard extends Card {
    subType: 'item';
    bonus: number;
    goldValue: number;
    slot?: 'head' | 'body' | 'hand' | 'foot' | 'big';
    usedBy?: string[]; // Classes/Races that can use it
}

export interface CurseCard extends Card {
    subType: 'curse';
    effect: (player: any) => void;
}

export interface ClassCard extends Card {
    subType: 'class';
    abilities: string[];
}

export interface RaceCard extends Card {
    subType: 'race';
    abilities: string[];
}

export interface GenericCard extends Card {
    subType: 'modifier' | 'other';
}

export interface BlessingCard extends Card {
    subType: 'blessing';
    effect: string;
}

// Union type for easier usage
export type GameCard = MonsterCard | ItemCard | CurseCard | ClassCard | RaceCard | BlessingCard | GenericCard;
