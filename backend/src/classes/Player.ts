export class Player {
    id: string;
    name: string;
    level: number;
    hand: any[]; // Define Card type later
    public race?: any; // RaceCard
    public class?: any; // ClassCard
    public equipment: any[]; // ItemCard[]
    public backpack: any[]; // Cards that cannot be equipped (private to player)
    public inCombat: boolean;
    public gold: number;
    public itemsSoldThisTurn: number; // For Esnaf class ability

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.level = 1;
        this.gold = 0;
        this.itemsSoldThisTurn = 0;
        this.hand = [];
        this.equipment = [];
        this.backpack = [];
        this.inCombat = false;
    }

    levelUp() {
        this.level++;
    }

    addCard(card: any) {
        this.hand.push(card);
    }

    get combatStrength(): number {
        let strength = this.level;
        this.equipment.forEach(item => {
            if (item.bonus) strength += item.bonus;
        });
        return strength;
    }
}
