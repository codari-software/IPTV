import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
    X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader,
    SkipBack, SkipForward, PictureInPicture2
} from 'lucide-react';

const PlayerModal = ({ streamUrl, onClose, title, onProgress, startTime = 0, onNext, onPrev, isLive = false }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const hlsRef = useRef(null);

    // Player State
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffering, setBuffering] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(() => {
        const saved = localStorage.getItem('playerSpeed');
        return saved ? parseFloat(saved) : 1;
    });
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [initialSetup, setInitialSetup] = useState(true);

    const controlsTimeoutRef = useRef(null);

    const [error, setError] = useState(null);

    // Initial Setup
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setError(null); // Reset error on new stream
        setBuffering(true);

        let playUrl = streamUrl;

        // 0. Format Fix (Pre-Proxy)
        if (playUrl.endsWith('.ts')) {
            playUrl = playUrl.replace('.ts', '.m3u8');
        }

        // 1. PROXY HANDLING (Live TV OR Mixed Content Prevention)
        // If stream is HTTP and we are on HTTPS, browsers block it (Mixed Content).
        // We must route through our local proxy (which runs on the same protocol as the page).
        const isMixedContentSource = typeof window !== 'undefined' && window.location.protocol === 'https:' && playUrl.startsWith('http:');
        const shouldUseProxy = (isLive || isMixedContentSource) && playUrl.startsWith('http');

        if (shouldUseProxy) {
            console.log(`Routing stream through /api/stream (Live: ${isLive}, Mixed: ${isMixedContentSource})`);
            const currentOrigin = window.location.origin;
            playUrl = `${currentOrigin}/api/stream?url=${encodeURIComponent(playUrl)}`;
        }

        // Mixed Content Check (Legacy/Heuristic for Error Reporting)
        // If we didn't proxy (e.g. dev mode), this might still trigger.
        const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && playUrl.startsWith('http:');

        // Check if HLS is needed
        // If we proxied, we can't just check for .m3u8 in playUrl string (it's encoded). 
        // We check the ORIGINAL streamUrl logic or if it's Live (implies HLS).
        // OR if the playUrl (proxied or not) explicitly has .m3u8 inside (e.g. encoded param).
        const isHls = playUrl.includes('.m3u8') || (shouldUseProxy && isLive);

        if (isHls && Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(playUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch((e) => console.log("Autoplay failed", e));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS Fatal", data);
                    if (isMixedContent) {
                        setError("Erro de Segurança: Navegador bloqueou conteúdo HTTP (Inseguro) em site HTTPS. Tente usar a versão HTTPS da sua lista.");
                    } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        setError("Erro de Conexão. O canal pode estar offline ou o formato não é suportado pelo Web Player. Tente usar o APP Desktop.");
                    } else {
                        setError("Erro ao carregar o canal. Verifique sua conexão ou se o canal está offline.");
                    }
                    hls.destroy();
                }
            });
        } else {
            video.src = playUrl;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((e) => {
                    // AbortError is benign (happens when src changes or pause is called quickly)
                    if (e.name === 'AbortError') return;
                    console.log("HTML5 Play failed", e);
                });
            }

            video.onerror = () => {
                setError("Erro ao carregar o vídeo. Pode ser bloqueio de CORS ou formato inválido.");
            };
        }

        return () => {
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [streamUrl]);

    // Format Time
    const formatTime = (time) => {
        if (!time) return "0:00";
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Event Handlers
    const togglePlay = () => {
        const video = videoRef.current;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const handleVolume = (e) => {
        const newVol = parseFloat(e.target.value);
        videoRef.current.volume = newVol;
        setVolume(newVol);
        setMuted(newVol === 0);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        const newMuted = !muted;
        video.muted = newMuted;
        setMuted(newMuted);
        if (newMuted) setVolume(0);
        else {
            setVolume(1);
            video.volume = 1;
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled && videoRef.current) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error("PiP Error:", error);
        }
    };

    const handleSpeedChange = (rate) => {
        const video = videoRef.current;
        video.playbackRate = rate;
        setPlaybackRate(rate);
        localStorage.setItem('playerSpeed', rate);
        setShowSpeedMenu(false);
    };

    // Auto-hide controls
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!videoRef.current) return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                    handleMouseMove();
                    break;
                case 'ArrowRight':
                case 'l':
                    if (isLive) break; // Disable seek for live
                    e.preventDefault();
                    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                    handleMouseMove();
                    break;
                case 'ArrowLeft':
                case 'j':
                    if (isLive) break; // Disable seek for live
                    e.preventDefault();
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    handleMouseMove();
                    break;
                case 'Escape':
                    if (!document.fullscreenElement) {
                        e.preventDefault();
                        onClose(videoRef.current.currentTime, videoRef.current.duration);
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isLive]);

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <div
                ref={containerRef}
                className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => playing && setShowControls(false)}
            >
                {/* Header */}
                <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <h3 className="text-white font-medium drop-shadow-md text-lg truncate max-w-[80%]">{title}</h3>
                    <button onClick={() => onClose(videoRef.current?.currentTime || 0, duration)} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Error Indicator */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80 p-8 text-center">
                        <div className="max-w-md bg-gray-900 border border-red-500/30 p-6 rounded-xl shadow-2xl">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Erro de Reprodução</h3>
                            <p className="text-gray-300 text-sm leading-relaxed mb-6">
                                {error}
                            </p>
                            <button
                                onClick={() => onClose(0, 0)}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
                            >
                                Fechar Player
                            </button>
                        </div>
                    </div>
                )}

                {/* Buffering Indicator */}
                {!error && buffering && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
                            <Loader size={40} className="text-blue-500 animate-spin" />
                        </div>
                    </div>
                )}

                {/* Video Element */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlay}
                    onTimeUpdate={() => {
                        const time = videoRef.current.currentTime;
                        setCurrentTime(time);
                        if (onProgress && !initialSetup) {
                            onProgress(time, videoRef.current.duration);
                        }
                    }}
                    onLoadedMetadata={() => {
                        setDuration(videoRef.current.duration);
                        if (startTime > 0 && initialSetup) {
                            videoRef.current.currentTime = startTime;
                        }
                        setBuffering(false);
                        setInitialSetup(false);
                        if (!isLive) videoRef.current.playbackRate = playbackRate;
                    }}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => {
                        setPlaying(true);
                        setBuffering(false);
                        setError(null);
                    }}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                        setPlaying(false);
                        if (onNext) onNext(duration, duration);
                    }}
                />

                {/* Play/Pause Overlay Animation */}
                {!playing && !buffering && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-black/20">
                        <div className="bg-white/10 p-6 rounded-full backdrop-blur-sm shadow-xl">
                            <Play size={48} className="text-white fill-current translate-x-1" />
                        </div>
                    </div>
                )}

                {/* Bottom Controls */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 pb-6 pt-12 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Progress Bar (Hidden for Live) */}
                    {!isLive && (
                        <div className="group/progress relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer">
                            <div
                                className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Navigation Controls */}
                            <div className="flex items-center gap-2">
                                {!isLive && (
                                    <button
                                        onClick={() => onPrev && onPrev(videoRef.current?.currentTime || 0, duration)}
                                        disabled={!onPrev}
                                        className={`text-white transition-colors ${!onPrev ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-400'}`}
                                    >
                                        <SkipBack size={24} fill="currentColor" />
                                    </button>
                                )}

                                <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                                    {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                                </button>

                                {!isLive && (
                                    <button
                                        onClick={() => onNext && onNext(videoRef.current?.currentTime || 0, duration)}
                                        disabled={!onNext}
                                        className={`text-white transition-colors ${!onNext ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-400'}`}
                                    >
                                        <SkipForward size={24} fill="currentColor" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 group/vol">
                                <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                                <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={muted ? 0 : volume}
                                        onChange={handleVolume}
                                        className="w-20 h-1 accent-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="text-sm font-medium text-gray-300">
                                {isLive ? (
                                    <span className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        AO VIVO
                                    </span>
                                ) : (
                                    <>
                                        <span>{formatTime(currentTime)}</span>
                                        <span className="mx-1 text-gray-500">/</span>
                                        <span>{formatTime(duration)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Speed Control (Hidden for Live) */}
                            {!isLive && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                        className="text-white hover:text-blue-400 transition-colors text-sm font-bold w-12"
                                    >
                                        {playbackRate}x
                                    </button>
                                    {showSpeedMenu && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg p-2 flex flex-col gap-1 min-w-[80px]">
                                            {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                                                <button
                                                    key={rate}
                                                    onClick={() => handleSpeedChange(rate)}
                                                    className={`text-sm py-1 px-2 rounded hover:bg-white/10 text-left ${playbackRate === rate ? 'text-blue-500 font-bold' : 'text-gray-300'}`}
                                                >
                                                    {rate}x
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {document.pictureInPictureEnabled && (
                                <button onClick={togglePiP} className="text-white hover:text-blue-400 transition-colors" title="Miniplayer">
                                    <PictureInPicture2 size={20} />
                                </button>
                            )}

                            <button onClick={toggleFullScreen} className="text-white hover:text-blue-400 transition-colors">
                                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerModal;
