import React from 'react';
import { Heart } from 'lucide-react'; // Import Heart icon

const CategoryList = ({ categories, selectedCategory, onSelect }) => {
    return (
        <div className="w-64 bg-gray-900 border-r border-white/5 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4">
                <h3 className="text-gray-400 font-semibold mb-4 text-sm uppercase tracking-wider">Categories</h3>
                <div className="space-y-1">
                    <button
                        onClick={() => onSelect('favorites')}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors mb-2 flex items-center gap-2 ${selectedCategory === 'favorites'
                                ? 'bg-red-600 text-white'
                                : 'text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        <Heart size={16} className={selectedCategory === 'favorites' ? "fill-white" : ""} />
                        Favorites
                    </button>
                    <button
                        onClick={() => onSelect(null)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === null
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        All Channels
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.category_id}
                            onClick={() => onSelect(cat.category_id)}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors truncate ${selectedCategory === cat.category_id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            {cat.category_name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryList;
