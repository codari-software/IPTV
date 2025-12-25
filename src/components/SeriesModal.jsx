import React, { useEffect, useState, useRef } from 'react';
import { getSeriesInfo } from '../services/api';
import PlayerModal from './PlayerModal';
import useWatchHistory from '../hooks/useWatchHistory';
import { X, Play, ChevronDown, ChevronRight } from 'lucide-react';

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

    const getAdjacentEpisode = (currentEp, direction) => {
        if (!currentEp || !selectedSeason) return null;
        const seasonNum = parseInt(selectedSeason);
        const epList = episodes[selectedSeason];
        const currentIndex = epList.findIndex(e => e.id === currentEp.id);

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
                return episodes[nextSeasonNum][0];
            }
        }

        return null;
    };

    const playEpisode = (episode, season = null) => {
        if (!episode) return;
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return;
        const { url, username, password } = JSON.parse(savedCreds);

        const currentSeason = season || selectedSeason || episode.season;
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
    const handleEpisodeClick = (episode) => playEpisode(episode);

    return (
        <div className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
            {playingEpisode && (
                <PlayerModal
                    streamUrl={playingEpisode.url}
                    title={`${series.name} - S${playingEpisode.season} E${playingEpisode.episode_num} - ${playingEpisode.title}`}
                    startTime={playingEpisode.startTime || 0}
                    onClose={() => setPlayingEpisode(null)}
                    onNext={() => {
                        const nextEp = getAdjacentEpisode(playingEpisode, 'next');
                        if (nextEp) playEpisode(nextEp);
                    }}
                    onPrev={() => {
                        const prevEp = getAdjacentEpisode(playingEpisode, 'prev');
                        if (prevEp) playEpisode(prevEp);
                    }}
                    onProgress={(time, duration) => {
                        const now = Date.now();
                        // Save every 10 seconds (10000 ms)
                        if (now - lastSaveTimeRef.current >= 10000) {
                            saveProgress(series.series_id, {
                                season: playingEpisode.season,
                                episode: playingEpisode.episode_num,
                                episodeId: playingEpisode.id,
                                timestamp: time,
                                duration: duration
                            });
                            lastSaveTimeRef.current = now;
                        }
                    }}
                />
            )}

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
                                src={info?.cover || series.cover}
                                alt={series.name}
                                className="w-full rounded-xl shadow-lg aspect-[2/3] object-cover"
                            />
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{series.name}</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">{info?.plot || 'No description available.'}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                                <p>Release: {info?.releaseDate}</p>
                                <p>Rating: {info?.rating}</p>
                            </div>
                        </div>

                        {/* Seasons & Episodes */}
                        <div className="flex-1 bg-gray-900 p-6 overflow-y-auto">
                            <h3 className="text-xl font-semibold mb-4 text-white">Seasons</h3>
                            <h3 className="text-xl font-semibold mb-4 text-white">Seasons</h3>
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
                                                Continue S{history.season}:E{history.episode}
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
                                        Season {s}
                                    </button>
                                ))}
                            </div>

                            <h3 className="text-xl font-semibold mb-4 text-white">Episodes</h3>
                            <div className="space-y-2">
                                {selectedSeason && episodes[selectedSeason]?.map(ep => (
                                    <div
                                        key={ep.id}
                                        onClick={() => handleEpisodeClick(ep)}
                                        className="flex items-center gap-4 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg cursor-pointer group transition-colors"
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full group-hover:bg-blue-600 transition-colors shrink-0">
                                            <Play size={14} className="ml-1 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {ep.episode_num}. {ep.title}
                                            </p>
                                        </div>
                                        <div className="ml-auto text-xs text-gray-500">
                                            {ep.container_extension}
                                        </div>
                                    </div>
                                ))}
                                {(!selectedSeason || !episodes[selectedSeason]) && (
                                    <p className="text-gray-500">No episodes available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeriesModal;
