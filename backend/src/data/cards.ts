export type CardType = 'door' | 'treasure';
export type SubType = 'monster' | 'curse' | 'race' | 'class' | 'item' | 'modifier' | 'blessing' | 'fightspells' | 'other';

export interface DeckConfiguration {
    [cardId: string]: number; // Maps base card ID to quantity
}

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
    badStuffEffect: any;
    levelReward: number;
}

export interface ItemCard extends Card {
    subType: 'item';
    bonus: number;
    goldValue: number;
    slot?: 'head' | 'body' | 'hand' | 'foot' | 'big';
    usedBy?: string[];
}

export interface FightSpellCard extends Card {
    subType: 'fightspells';
    bonus: number;
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
    effect: string;
}

export interface BlessingCard extends Card {
    subType: 'blessing';
    effect: string;
}

export type GameCard = MonsterCard | ItemCard | RaceCard | ClassCard | CurseCard | BlessingCard | FightSpellCard | Card;

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
        badStuff: 'Seni çuvala koyup götürür. Bütün eşyalarını kaybedersin.',
        badStuffEffect: null,
        image: '/assets/cards/gulyabani.png',
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
        id: 'm3',
        name: 'Mahalle Abisi',
        type: 'door',
        subType: 'monster',
        description: 'Tespih sallıyor.',
        level: 4,
        treasure: 1,
        levelReward: 1,
        badStuff: 'Sana kafa atar. Başlığını kaybedersin.',
        badStuffEffect: null,
    } as any,
    {
        id: 'm4',
        name: 'Altın Günü Teyzeleri',
        type: 'door',
        subType: 'monster',
        description: 'Kısır yiyorlar ve seni yargılıyorlar.',
        level: 12,
        treasure: 3,
        levelReward: 1,
        badStuff: 'Evlenip evlenmediğini sorarlar. Utancından ölürsün.',
        badStuffEffect: null,
    } as any,
    {
        id: 'c1',
        name: 'Nazar Çıktı',
        type: 'door',
        subType: 'curse',
        description: 'Envanterindeki veya çantasındaki rastgele bir eşya yok oldu.',
        effect: 'Discard random item',
    } as any,
    {
        id: 'cl1',
        name: 'Esnaf',
        type: 'door',
        subType: 'class',
        description: 'Satış yeteneği: Turundaki ilk sattığın eşyayı 2 katı fiyatına satarsın.',
        abilities: ['pazarlik'],
    } as any,
    {
        id: 'cl2',
        name: 'Memur',
        type: 'door',
        subType: 'class',
        description: 'Mesai bitti: Savaşta bir kez monsterı görmezden gelip kaçabilirsin.',
        abilities: ['kacis'],
    } as any,
    {
        id: 'c_cigkofte',
        name: 'Ekstra Acılı Çiğ Köfte',
        type: 'door',
        subType: 'curse',
        description: 'O kadar acı ki gücünü 3 azalttı! (Bir tur boyunca -3 Güç)',
        image: '/assets/cards/cigkofte.png',
    } as any,
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
    {
        id: 'fs_arabulucu',
        name: 'Ara Bulucu',
        type: 'door',
        subType: 'fightspells',
        description: 'Savaşçıya huzur verir. Savaşı anında bitirir. Kazanırsın ama 1 Seviye KAYBEDERSİN ve hiç hazine kazanamazsın. (Sadece Savaşçıya Kullanılır)',
        bonus: 9999, // Special marker for instant win
    } as any,
    {
        id: 'fs_olmbakgit',
        name: 'Olm Bak Git',
        type: 'door',
        subType: 'fightspells',
        description: 'Elinizdeki bir canavarı herhangi bir savaşa istediğiniz tarafta dahil edersiniz. Canavarın gücü o tarafa eklenir.',
        bonus: 0, // Bonus depends on selected monster
        image: '/assets/cards/olmbakgit.png',
    } as any,
    {
        id: 'm_math',
        name: 'Matematik Hocası',
        type: 'door',
        subType: 'monster',
        description: 'Tahtaya kalkınca dizlerin titrer.',
        level: 8,
        treasure: 3,
        levelReward: 1,
        badStuff: 'Matematik sorularıyla boğar. 1 seviye kaybedersin.',
        badStuffEffect: null,
        image: '/assets/cards/math_teacher.png',
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
        image: '/assets/cards/islakodun.png',
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
        image: '/assets/cards/anneterligi.png',
    } as any,
    {
        id: 'i3',
        name: 'Dantelli Televizyon Örtüsü',
        type: 'treasure',
        subType: 'item',
        description: 'Canavarların kafasını karıştırır.',
        bonus: 2,
        goldValue: 200,
        slot: 'head',
    } as any,
    {
        id: 'i4',
        name: 'Nazar Boncuğu',
        type: 'treasure',
        subType: 'item',
        description: 'Lanetlere karşı korur.',
        bonus: 1,
        goldValue: 100,
        slot: 'body',
    } as any,
    {
        id: 'i5',
        name: 'Çeyrek Altın',
        type: 'treasure',
        subType: 'item',
        description: 'Düğünde takarsın.',
        bonus: 0,
        goldValue: 1000,
    } as any,
    {
        id: 'b_ballipust',
        name: 'Ballı Puşt',
        type: 'treasure',
        subType: 'blessing',
        description: 'Gene iyisin ha',
        effect: 'Level Up',
    } as any,
    {
        id: 'fs_mahalleabisi_1',
        name: 'Mahalle Abisi (Savaş Büyüsü)',
        type: 'treasure',
        subType: 'fightspells',
        description: '50 kuruş için ölür. Seçtiğin taraf +5 güç kazanır.',
        bonus: 5,
    } as any,
];
