import React, { useEffect, useState } from 'react';
import { getLiveCategories, getLiveStreams } from '../services/api';
import CategoryList from '../components/CategoryList';
import ContentGrid from '../components/ContentGrid';
import PlayerModal from '../components/PlayerModal';
import useFavorites from '../hooks/useFavorites';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LiveTV = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [channels, setChannels] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [playingChannel, setPlayingChannel] = useState(null);
    const { toggleFavorite, isFavorite, getFavoritesByType } = useFavorites('live');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const savedCreds = localStorage.getItem('iptv_credentials');
            if (!savedCreds) return;

            const { url, username, password } = JSON.parse(savedCreds);

            const cats = await getLiveCategories(url, username, password);
            setCategories(cats);

            // Optimization: Fetch only the first category by default
            if (cats.length > 0) {
                const firstCatId = cats[0].category_id;
                setSelectedCategory(firstCatId);
                const streams = await getLiveStreams(url, username, password, firstCatId);
                setChannels(streams);
            } else {
                setChannels([]);
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
            setChannels(favs);
        } else {
            const savedCreds = localStorage.getItem('iptv_credentials');
            const { url, username, password } = JSON.parse(savedCreds);
            const streams = await getLiveStreams(url, username, password, categoryId);
            setChannels(streams);
        }

        setLoading(false);
    };

    const filteredChannels = channels.filter(ch =>
        ch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChannelClick = (channel) => {
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return;
        const { url, username, password } = JSON.parse(savedCreds);

        // Construct stream URL
        // Standard XC format: http://domain:port/live/user/pass/streamID.ts
        const streamUrl = `${url}/live/${username}/${password}/${channel.stream_id}.ts`;

        setPlayingChannel({ ...channel, url: streamUrl });
    };

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            {playingChannel && (
                <PlayerModal
                    streamUrl={playingChannel.url}
                    title={playingChannel.name}
                    onClose={() => setPlayingChannel(null)}
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
                        <h1 className="text-lg font-bold text-white">Live TV</h1>
                    </div>

                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search channel..."
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
                            items={filteredChannels}
                            onItemClick={handleChannelClick}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveTV;
