import type { GameCard } from "../../types/game";

interface CardProps {
    card: GameCard;
    onClick?: () => void;
    onDiscard?: () => void; // New prop for discarding
    isPlayable?: boolean;
}

export function Card({ card, onClick, onDiscard, isPlayable = false }: CardProps) {
    const getBorderColor = () => {
        if (card.type === 'door') return 'border-red-800';
        if (card.type === 'treasure') return 'border-yellow-600';
        return 'border-gray-500';
    };

    const getBgColor = () => {
        if (card.type === 'door') return 'bg-amber-100';
        if (card.type === 'treasure') return 'bg-yellow-50';
        return 'bg-white';
    };

    return (
        <div
            className={`
        relative w-40 h-60 rounded-xl border-4 ${getBorderColor()} ${getBgColor()}
        shadow-lg flex flex-col p-2 text-slate-900 select-none transition-transform group
        ${isPlayable ? 'hover:-translate-y-4 cursor-pointer hover:shadow-2xl' : ''}
      `}
        >
            {/* Discard Button - Only visible if onDiscard provided */}
            {onDiscard && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        onDiscard();
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center border border-white shadow hover:bg-red-800 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Bu kartı at"
                >
                    ✕
                </button>
            )}

            <div onClick={isPlayable ? onClick : undefined} className="h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm leading-tight">{card.name}</h3>
                    {card.subType === 'monster' && (
                        <span className="text-xs font-bold bg-slate-800 text-white px-1 rounded">Lvl {card.level}</span>
                    )}
                </div>

                {/* Image Area */}
                <div className="w-full h-24 bg-slate-200/50 border border-slate-300/50 mb-2 flex items-center justify-center text-[10px] text-slate-400 overflow-hidden rounded-sm ring-1 ring-slate-300/20">
                    {card.image ? (
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Kayıp+Resim';
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center opacity-40">
                            <span className="text-xl mb-1">🖼️</span>
                            <span>Resim Yok</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] leading-tight mb-2">{card.description}</p>

                    {card.subType === 'monster' && (
                        <>
                            <div className="text-[9px] text-green-700 border-t border-green-200 mt-1 pt-1">
                                <span className="font-bold">Kazanç:</span> {card.levelReward} Seviye, {card.treasure} Hazine
                            </div>
                            <div className="text-[9px] text-red-700 italic border-t border-red-200 mt-1 pt-1">
                                <span className="font-bold">Kaybedince:</span> {card.badStuff}
                            </div>
                        </>
                    )}
                    {card.subType === 'item' && (
                        <div className="text-[10px] font-bold mt-1">
                            Bonus: +{card.bonus} {card.slot ? `(${card.slot})` : ''}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-1 flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>{card.subType.toUpperCase()}</span>
                    {card.subType === 'item' && card.goldValue && <span className="text-yellow-700">{card.goldValue} Altın</span>}
                </div>
            </div>
        </div>
    );
}
