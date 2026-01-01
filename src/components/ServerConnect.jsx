import React, { useState } from 'react';
import { Tv, Globe, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { authenticate } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ServerConnect = ({ onConnect }) => {
    const [credentials, setCredentials] = useState({
        url: '',
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { updateUserSettings } = useAuth();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await authenticate(credentials.url, credentials.username, credentials.password);

        if (result.success) {
            const data = {
                credentials: {
                    ...credentials,
                    url: result.serverUrl // use the formatted URL
                },
                server_info: result.data.server_info
            };

            try {
                // Save to Firestore
                await updateUserSettings(data);
                // Parent component will handle state update/navigation
                onConnect(data);
            } catch (err) {
                setError("Failed to save settings: " + err.message);
            }
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 space-y-8 mx-auto">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-500 mb-4 animate-pulse">
                    <Tv size={32} />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Connect Server
                </h1>
                <p className="text-gray-400">Enter your Xtream Codes credentials</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
                    <AlertCircle size={20} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                            <Globe size={20} />
                        </div>
                        <input
                            type="text"
                            name="url"
                            required
                            placeholder="http://example.com:8080"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            value={credentials.url}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            name="username"
                            required
                            placeholder="Username"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            value={credentials.username}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="Password"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            value={credentials.password}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Connect <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default ServerConnect;
