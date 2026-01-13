import type { GameCard } from "../../types/game";

interface CardProps {
    card: GameCard;
    onClick?: () => void;
    isPlayable?: boolean;
}

export function Card({ card, onClick, isPlayable = false }: CardProps) {
    const getBorderColor = () => {
        if (card.type === 'door') return 'border-red-800';
        if (card.type === 'treasure') return 'border-yellow-600';
        return 'border-gray-500';
    };

    const getBgColor = () => {
        if (card.type === 'door') return 'bg-amber-100';
        if (card.type === 'treasure') return 'bg-yellow-50';
        return 'bg-white';
    }

    return (
        <div
            onClick={isPlayable ? onClick : undefined}
            className={`
        relative w-40 h-60 rounded-xl border-4 ${getBorderColor()} ${getBgColor()}
        shadow-lg flex flex-col p-2 text-slate-900 select-none transition-transform
        ${isPlayable ? 'hover:-translate-y-4 cursor-pointer hover:shadow-2xl' : ''}
      `}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm leading-tight">{card.name}</h3>
                {card.subType === 'monster' && (
                    <span className="text-xs font-bold bg-slate-800 text-white px-1 rounded">Lvl {(card as any).level}</span>
                )}
            </div>

            {/* Image Placeholder */}
            <div className="w-full h-24 bg-slate-200 border border-slate-300 mb-2 flex items-center justify-center text-xs text-slate-500">
                {card.image ? <img src={card.image} /> : 'Resim Yok'}
            </div>

            {/* Description */}
            <div className="flex-1 overflow-hidden">
                <p className="text-[10px] leading-tight mb-2">{card.description}</p>

                {card.subType === 'monster' && (
                    <div className="text-[9px] text-red-700 italic border-t border-red-200 pt-1">
                        <span className="font-bold">Bad Stuff:</span> {(card as any).badStuff}
                    </div>
                )}
                {card.subType === 'item' && (
                    <div className="text-[10px] font-bold mt-1">
                        Bonus: +{(card as any).bonus} {(card as any).slot ? `(${(card as any).slot})` : ''}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-1 flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>{card.subType.toUpperCase()}</span>
                {(card as any).goldValue && <span className="text-yellow-700">{(card as any).goldValue} Altın</span>}
            </div>
        </div>
    );
}
