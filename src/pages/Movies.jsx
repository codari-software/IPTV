import React, { useEffect, useState } from 'react';
import { getVodCategories, getVodStreams } from '../services/api';
import CategoryList from '../components/CategoryList';
import ContentGrid from '../components/ContentGrid';
import PlayerModal from '../components/PlayerModal';
import useFavorites from '../hooks/useFavorites';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Movies = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [movies, setMovies] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [playingMovie, setPlayingMovie] = useState(null);
    const { toggleFavorite, isFavorite, getFavoritesByType } = useFavorites('movie');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const savedCreds = localStorage.getItem('iptv_credentials');
            if (!savedCreds) return;

            const { url, username, password } = JSON.parse(savedCreds);

            const cats = await getVodCategories(url, username, password);
            setCategories(cats);

            // Optimization: Fetch only the first category by default
            if (cats.length > 0) {
                const firstCatId = cats[0].category_id;
                setSelectedCategory(firstCatId);
                const streams = await getVodStreams(url, username, password, firstCatId);
                setMovies(streams);
            } else {
                setMovies([]);
            }

            setLoading(false);
        };
        fetchData();
    }, []);

    const handleCategorySelect = async (categoryId) => {
        setSelectedCategory(categoryId);
        setLoading(true);

        if (categoryId === 'favorites') {
            const favs = getFavoritesByType();
            setMovies(favs);
        } else {
            const savedCreds = localStorage.getItem('iptv_credentials');
            const { url, username, password } = JSON.parse(savedCreds);
            const streams = await getVodStreams(url, username, password, categoryId);
            setMovies(streams);
        }
        setLoading(false);
    };

    const filteredMovies = movies.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleMovieClick = (movie) => {
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return;
        const { url, username, password } = JSON.parse(savedCreds);

        // VOD extension is often .mp4 or .mkv. 
        // The API actually supports /movie/username/password/stream_id.mp4 or .mkv
        // We can default to .mp4 or check container_extension from API if available. 
        // Xtream Codes get_vod_streams usually returns 'container_extension' field.
        const extension = movie.container_extension || 'mp4';
        const streamUrl = `${url}/movie/${username}/${password}/${movie.stream_id}.${extension}`;

        setPlayingMovie({ ...movie, url: streamUrl });
    };

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            {playingMovie && (
                <PlayerModal
                    streamUrl={playingMovie.url}
                    title={playingMovie.name}
                    onClose={() => setPlayingMovie(null)}
                />
            )}
            <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
            />

            <div className="flex-1 flex flex-col h-full">
                <header className="h-16 bg-gray-900 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-white">Movies</h1>
                    </div>

                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search movie..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-gray-950 p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ContentGrid
                            items={filteredMovies}
                            onItemClick={handleMovieClick}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Movies;
