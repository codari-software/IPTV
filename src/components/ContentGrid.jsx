import React from 'react';
import { Play, Heart, RotateCcw } from 'lucide-react';
import useWatchHistory from '../hooks/useWatchHistory';

const ContentGrid = ({ items, onItemClick, onToggleFavorite, isFavorite }) => {
    const { getProgress } = useWatchHistory();
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {items.map((item) => (
                <div
                    key={item.stream_id}
                    onClick={() => onItemClick(item)}
                    className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all"
                >
                    {item.stream_icon || item.cover || item.logo ? (
                        <img
                            src={item.stream_icon || item.cover || item.logo}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x169/1f2937/6b7280?text=No+Image';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                            <span className="text-xs text-center px-2">{item.name}</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-3 bg-blue-600 rounded-full text-white shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                            <Play size={20} fill="currentColor" />
                        </div>
                    </div>

                    {onToggleFavorite && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(item);
                            }}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-red-500/20 text-white transition-colors z-10"
                        >
                            <Heart
                                size={18}
                                className={isFavorite && isFavorite(item) ? "fill-red-500 text-red-500" : "text-white"}
                            />
                        </button>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-sm font-medium text-white truncate">{item.name}</p>

                        {/* Continue Watching Button */}
                        {(() => {
                            const progress = getProgress(item.series_id || item.stream_id);
                            if (progress && progress.season) {
                                return (
                                    <button
                                        className="mt-1 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onItemClick(item); // Open modal, ideally it should auto-resume or highlight
                                        }}
                                    >
                                        <RotateCcw size={12} />
                                        Continue S{progress.season} E{progress.episode}
                                    </button>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ContentGrid;
