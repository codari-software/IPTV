import React from 'react';
import { Tv, Film, Clapperboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('iptv_credentials');
        navigate('/login');
    };

    const categories = [
        { id: 'live', name: 'Live TV', icon: Tv, color: 'from-blue-500 to-cyan-500' },
        { id: 'movies', name: 'Movies', icon: Film, color: 'from-purple-500 to-pink-500' },
        { id: 'series', name: 'Series', icon: Clapperboard, color: 'from-orange-500 to-red-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-6 text-white">
            <header className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Tv size={24} />
                    </div>
                    <h1 className="text-2xl font-bold">IPTV Pro</h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </header>

            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-8">What would you like to watch?</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => navigate(`/${cat.id}`)}
                            className="relative group cursor-pointer overflow-hidden rounded-2xl bg-gray-900 border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                            <div className="p-8 flex flex-col items-center justify-center h-64 gap-6">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${cat.color} bg-opacity-20 shadow-lg`}>
                                    <cat.icon size={48} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-semibold">{cat.name}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
