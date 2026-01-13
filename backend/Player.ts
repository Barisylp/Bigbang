export class Player {
    id: string;
    name: string;
    level: number;
    hand: any[]; // Define Card type later
    equipment: any[]; // Define Card type later
    inCombat: boolean;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.level = 1;
        this.hand = [];
        this.equipment = [];
        this.inCombat = false;
    }

    levelUp() {
        this.level++;
    }

    addCard(card: any) {
        this.hand.push(card);
    }
}
