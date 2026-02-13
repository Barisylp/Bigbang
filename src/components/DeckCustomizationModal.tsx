import React, { useState } from 'react';
import { DOOR_DECK, TREASURE_DECK } from '../data/cards';
import type { DeckConfiguration, GameCard } from '../types/game';

interface DeckCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckConfig: DeckConfiguration;
    onUpdateConfig: (config: DeckConfiguration) => void;
}

const DeckCustomizationModal: React.FC<DeckCustomizationModalProps> = ({
    isOpen,
    onClose,
    deckConfig,
    onUpdateConfig,
}) => {
    const [localConfig, setLocalConfig] = useState<DeckConfiguration>(deckConfig);

    if (!isOpen) return null;

    const handleQuantityChange = (cardId: string, delta: number) => {
        const currentQuantity = localConfig[cardId] || 2; // Default to 2
        const newQuantity = Math.max(0, Math.min(10, currentQuantity + delta));
        setLocalConfig({ ...localConfig, [cardId]: newQuantity });
    };

    const handleSave = () => {
        onUpdateConfig(localConfig);
        onClose();
    };

    const renderCard = (card: GameCard) => {
        const quantity = localConfig[card.id] !== undefined ? localConfig[card.id] : 2;
        const isDoorCard = card.type === 'door';

        return (
            <div
                key={card.id}
                className={`relative bg-slate-800 border-2 ${isDoorCard ? 'border-red-500' : 'border-amber-500'
                    } rounded-lg p-3 flex flex-col`}
            >
                {/* +/- Buttons in top right */}
                <div className="absolute top-2 right-2 flex gap-1">
                    <button
                        onClick={() => handleQuantityChange(card.id, -1)}
                        className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center text-lg font-bold"
                    >
                        -
                    </button>
                    <button
                        onClick={() => handleQuantityChange(card.id, 1)}
                        className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center text-lg font-bold"
                    >
                        +
                    </button>
                </div>

                {/* Card Content */}
                <div className="pr-16">
                    <h3 className="text-sm font-bold text-white mb-1">{card.name}</h3>
                    <p className="text-xs text-slate-400 mb-1">
                        {card.subType === 'monster' && `Seviye: ${(card as any).level}`}
                        {card.subType === 'item' && `Bonus: +${(card as any).bonus}`}
                        {card.subType === 'curse' && 'Lanet'}
                        {card.subType === 'class' && 'Sınıf'}
                        {card.subType === 'race' && 'Irk'}
                        {card.subType === 'blessing' && 'Nimet'}
                        {card.subType === 'fightspells' && 'Savaş Büyüsü'}
                    </p>
                    <p className="text-xs text-slate-300 line-clamp-2">{card.description}</p>
                </div>

                {/* Quantity at bottom */}
                <div className="mt-2 text-center">
                    <span className="text-sm font-bold text-amber-400">Adet: {quantity}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl border-2 border-amber-500 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-amber-500">Destelerim</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Oyunda kullanılacak kart sayılarını özelleştirin
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Door Deck */}
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                            <span>🚪</span>
                            <span>Kapı Destesi</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {DOOR_DECK.map(renderCard)}
                        </div>
                    </div>

                    {/* Treasure Deck */}
                    <div>
                        <h3 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                            <span>💰</span>
                            <span>Hazine Destesi</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {TREASURE_DECK.map(renderCard)}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 flex gap-4">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                        Kaydet
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeckCustomizationModal;
