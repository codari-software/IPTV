import React, { useEffect, useState, useRef } from 'react';
import { getSeriesInfo } from '../services/api';
import PlayerModal from './PlayerModal';
import useWatchHistory from '../hooks/useWatchHistory';
import { X, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { getSecureImage } from '../utils/imageHelper';

const SeriesModal = ({ series, onClose }) => {
    const [info, setInfo] = useState(null);
    const [episodes, setEpisodes] = useState({});
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playingEpisode, setPlayingEpisode] = useState(null);
    const { saveProgress, getProgress } = useWatchHistory();
    const lastSaveTimeRef = useRef(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const savedCreds = localStorage.getItem('iptv_credentials');
            if (!savedCreds) return;
            const { url, username, password } = JSON.parse(savedCreds);

            const data = await getSeriesInfo(url, username, password, series.series_id);
            if (data) {
                setInfo(data.info);
                // episodes is usually an object { "1": [ep1, ep2], "2": [...] } or array of arrays
                setEpisodes(data.episodes || {});
                // Extract season keys logic
                const seasonKeys = Object.keys(data.episodes || {});
                setSeasons(seasonKeys);

                // Check history for last watched season
                const history = getProgress(series.series_id);
                if (history && history.season && seasonKeys.includes(String(history.season))) {
                    setSelectedSeason(String(history.season));
                } else if (seasonKeys.length > 0) {
                    setSelectedSeason(seasonKeys[0]);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [series]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !playingEpisode) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, playingEpisode]);

    const getAdjacentEpisode = (currentEp, direction) => {
        // Use currentEp.season if available to prevent issues when selectedSeason is out of sync
        const activeSeason = currentEp?.season ? String(currentEp.season) : selectedSeason;
        if (!currentEp || !activeSeason) return null;

        const seasonNum = parseInt(activeSeason);
        const epList = episodes[activeSeason];

        if (!epList) return null;

        const currentIndex = epList.findIndex(e => e.id === currentEp.id);

        if (currentIndex === -1) return null;

        // Same season navigation
        if (direction === 'next' && currentIndex < epList.length - 1) {
            return epList[currentIndex + 1];
        }
        if (direction === 'prev' && currentIndex > 0) {
            return epList[currentIndex - 1];
        }

        // Cross season navigation
        if (direction === 'next') {

            // Better to sort seasons numerically to find true next 
            const sortedSeasons = [...seasons].sort((a, b) => parseInt(a) - parseInt(b));
            const nextSeasonNum = sortedSeasons.find(s => parseInt(s) > seasonNum);
            if (nextSeasonNum && episodes[nextSeasonNum]?.length > 0) {
                return { ...episodes[nextSeasonNum][0], season: nextSeasonNum };
            }
        }

        return null;
    };

    const playEpisode = (episode, season = null) => {
        if (!episode) return;
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return;
        const { url, username, password } = JSON.parse(savedCreds);

        const currentSeason = season || episode.season || selectedSeason;
        const extension = episode.container_extension || 'mp4';
        const streamUrl = `${url}/series/${username}/${password}/${episode.id}.${extension}`;

        // Update selected season if traversing
        if (currentSeason !== selectedSeason) {
            setSelectedSeason(String(currentSeason));
        }

        console.log("Playing Series Episode:", streamUrl);
        setPlayingEpisode({ ...episode, url: streamUrl, season: currentSeason });
        // Reset save timer when starting new episode so it saves immediately at start
        lastSaveTimeRef.current = 0;
    };

    // Replace the old simple handleEpisodeClick with this
    const saveCurrentProgress = (time, duration) => {
        if (!playingEpisode) return;
        // Avoid saving if time is very close to 0 (unless we want to save "started")
        // But for resume, 0 is fine.
        const progressData = {
            season: playingEpisode.season,
            episode: playingEpisode.episode_num,
            episodeId: playingEpisode.id,
            timestamp: time,
            duration: duration
        };
        saveProgress({
            [series.series_id]: { ...progressData, type: 'series_resume' },
            [String(playingEpisode.id)]: { ...progressData, type: 'episode_progress' }
        });
    };

    const handleEpisodeClick = (episode) => playEpisode(episode);

    return (
        <div className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="bg-gray-900 w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden flex shadow-2xl border border-white/10 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {loading ? (
                    <div className="w-full h-96 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row w-full h-full">
                        {/* Cover & Info */}
                        <div className="w-full md:w-1/3 bg-gray-950 p-6 flex flex-col gap-4 overflow-y-auto">
                            <img
                                src={getSecureImage(info?.cover || series.cover)}
                                alt={series.name}
                                className="w-full rounded-xl shadow-lg aspect-[2/3] object-cover"
                            />
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{series.name}</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">{info?.plot || 'Nenhuma descrição disponível.'}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                                <p>Lançamento: {info?.releaseDate}</p>
                                <p>Avaliação: {info?.rating}</p>
                            </div>
                        </div>

                        {/* Seasons & Episodes */}
                        <div className="flex-1 bg-gray-900 p-6 overflow-y-auto">
                            <h3 className="text-xl font-semibold mb-4 text-white">Temporadas</h3>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {/* Continue Button in Season List */}
                                {(() => {
                                    const history = getProgress(series.series_id);
                                    if (history && history.season && history.episode) {
                                        return (
                                            <button
                                                onClick={() => {
                                                    const ep = episodes[history.season]?.find(e => e.episode_num == history.episode);
                                                    if (ep) {
                                                        const extension = ep.container_extension || 'mp4';
                                                        const savedCreds = localStorage.getItem('iptv_credentials');
                                                        const { url, username, password } = JSON.parse(savedCreds);
                                                        const streamUrl = `${url}/series/${username}/${password}/${ep.id}.${extension}`;

                                                        setPlayingEpisode({
                                                            ...ep,
                                                            url: streamUrl,
                                                            startTime: history.timestamp,
                                                            season: history.season
                                                        });
                                                    }
                                                }}
                                                className="px-4 py-2 rounded-lg text-sm font-bold transition-colors bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2"
                                            >
                                                <Play size={14} fill="currentColor" />
                                                Continuar T{history.season}:E{history.episode}
                                            </button>
                                        );
                                    }
                                })()}
                                {seasons.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSelectedSeason(s)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedSeason === s
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        Temporada {s}
                                    </button>
                                ))}
                            </div>

                            <h3 className="text-xl font-semibold mb-4 text-white">Episódios</h3>
                            <div className="space-y-2">
                                {selectedSeason && episodes[selectedSeason]?.map(ep => (
                                    <div
                                        key={ep.id}
                                        onClick={() => {
                                            // Check for history to resume
                                            const history = getProgress(String(ep.id));
                                            const startTime = history ? history.timestamp : 0;
                                            playEpisode({ ...ep, startTime });
                                        }}
                                        className="flex gap-4 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg cursor-pointer group transition-colors"
                                    >
                                        {/* Episode Thumbnail */}
                                        <div className="relative w-40 aspect-video bg-gray-900 rounded-md overflow-hidden shrink-0">
                                            <img
                                                src={getSecureImage(ep.info?.movie_image || info?.cover || series.cover)}
                                                alt={ep.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // On error, try placeholder
                                                    e.target.src = 'https://via.placeholder.com/300x169/1f2937/6b7280?text=No+Preview';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                                                    <Play size={20} fill="white" className="text-white" />
                                                </div>
                                            </div>
                                            {/* Duration tag */}
                                            {ep.info?.duration && (
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white">
                                                    {ep.info.duration}
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {(() => {
                                                const history = getProgress(String(ep.id));
                                                if (history && history.duration > 0) {
                                                    const pct = Math.min(100, Math.max(0, (history.timestamp / history.duration) * 100));
                                                    return (
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
                                                            <div
                                                                className="h-full bg-red-600"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-white">
                                                    {ep.episode_num}.
                                                </span>
                                                <h4 className="text-sm font-medium text-white truncate">
                                                    {ep.title}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-2">
                                                {ep.info?.plot || 'Nenhuma descrição disponível para este episódio.'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!selectedSeason || !episodes[selectedSeason]) && (
                                    <p className="text-gray-500">Nenhum episódio disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {playingEpisode && (
                <PlayerModal
                    streamUrl={playingEpisode.url}
                    title={`${series.name} - S${playingEpisode.season} E${playingEpisode.episode_num} - ${playingEpisode.title}`}
                    startTime={playingEpisode.startTime || 0}
                    onClose={(t, d) => {
                        if (t !== undefined) saveCurrentProgress(t, d);
                        setPlayingEpisode(null);
                    }}
                    onNext={(t, d) => {
                        if (t !== undefined) saveCurrentProgress(t, d);
                        const nextEp = getAdjacentEpisode(playingEpisode, 'next');
                        if (nextEp) playEpisode(nextEp);
                    }}
                    onPrev={(t, d) => {
                        if (t !== undefined) saveCurrentProgress(t, d);
                        const prevEp = getAdjacentEpisode(playingEpisode, 'prev');
                        if (prevEp) playEpisode(prevEp);
                    }}
                    onProgress={(time, duration) => {
                        const now = Date.now();
                        // Save every 10 seconds (10000 ms)
                        if (now - lastSaveTimeRef.current >= 10000) {
                            saveCurrentProgress(time, duration);
                            lastSaveTimeRef.current = now;
                        }
                    }}
                />
            )}
        </div>
    );
};

export default SeriesModal;
