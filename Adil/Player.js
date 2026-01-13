class Player {
    constructor(id, name) {
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

    addCard(card) {
        this.hand.push(card);
    }
}

module.exports = Player;
