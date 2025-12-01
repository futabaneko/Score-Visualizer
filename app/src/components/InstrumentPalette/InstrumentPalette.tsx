import React from 'react';
import { INSTRUMENTS } from '../../constants';
import { useScoreStore } from '../../store/useScoreStore';
import { playNote } from '../../utils/audioEngine';

export const InstrumentPalette: React.FC = () => {
  const { settings, setSelectedInstrument } = useScoreStore();
  const selectedInstrument = settings.selectedInstrument;

  const handleInstrumentClick = (instrumentId: string) => {
    setSelectedInstrument(instrumentId);
    // 選択時にプレビュー音を再生
    playNote(instrumentId, 12); // M（中央）の音
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">楽器パレット</h3>
      <div className="grid grid-cols-3 gap-2">
        {INSTRUMENTS.map((instrument) => (
          <button
            key={instrument.id}
            onClick={() => handleInstrumentClick(instrument.id)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg
              transition-all duration-150 cursor-pointer
              ${
                selectedInstrument === instrument.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-100'
              }
            `}
            title={`${instrument.nameJa} (${instrument.symbol})`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: instrument.color }}
            >
              {instrument.symbol}
            </div>
            <span className="text-xs mt-1 text-gray-600 truncate w-full text-center">
              {instrument.nameJa}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
