import axios from 'axios';

// Helper function to handle requests via proxy if needed
const apiGet = async (baseUrl, params, customActionUrl = 'player_api.php') => {
    try {
        let formattedUrl = baseUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `http://${formattedUrl}`;
        }
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }

        const targetUrl = `${formattedUrl}/${customActionUrl}`;

        // Determine if we should use the internal proxy
        // We default to TRUE in browser logic to avoid CORS errors completely.
        let useProxy = false;
        if (typeof window !== 'undefined') {
            useProxy = true;
        }

        let requestUrl = targetUrl;
        let requestParams = { ...params };

        if (useProxy) {
            requestUrl = '/api/proxy';
            requestParams = {
                url: targetUrl,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params: requestParams });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const authenticate = async (baseUrl, username, password) => {
    try {
        const data = await apiGet(baseUrl, { username, password });
        if (data && data.user_info && data.user_info.auth === 1) {
            // Need to return raw baseUrl as well for other components to use
            let formattedUrl = baseUrl;
            if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                formattedUrl = `http://${formattedUrl}`;
            }
            if (formattedUrl.endsWith('/')) {
                formattedUrl = formattedUrl.slice(0, -1);
            }
            return { success: true, data: data, serverUrl: formattedUrl };
        } else {
            return { success: false, message: 'Invalid credentials or expired account' };
        }
    } catch (error) {
        console.error("Login Check Error", error);
        return {
            success: false,
            message: error.response?.status === 404
                ? 'Server not found or invalid URL'
                : 'Connection failed. Check your URL and internet connection.'
        };
    }
};

export const getLiveCategories = async (baseUrl, username, password) => {
    try {
        return await apiGet(baseUrl, { username, password, action: 'get_live_categories' }) || [];
    } catch (error) {
        console.error("Error fetching live categories", error);
        return [];
    }
};

export const getLiveStreams = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_live_streams' };
        if (categoryId) params.category_id = categoryId;
        return await apiGet(baseUrl, params) || [];
    } catch (error) {
        console.error("Error fetching live streams", error);
        return [];
    }
};

export const getVodCategories = async (baseUrl, username, password) => {
    try {
        return await apiGet(baseUrl, { username, password, action: 'get_vod_categories' }) || [];
    } catch (error) {
        console.error("Error fetching VOD categories", error);
        return [];
    }
};

export const getVodStreams = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_vod_streams' };
        if (categoryId) params.category_id = categoryId;
        return await apiGet(baseUrl, params) || [];
    } catch (error) {
        console.error("Error fetching VOD streams", error);
        return [];
    }
};

export const getVodInfo = async (baseUrl, username, password, vodId) => {
    try {
        return await apiGet(baseUrl, { username, password, action: 'get_vod_info', vod_id: vodId });
    } catch (error) {
        console.error("Error fetching VOD info", error);
        return null;
    }
};

export const getSeriesCategories = async (baseUrl, username, password) => {
    try {
        return await apiGet(baseUrl, { username, password, action: 'get_series_categories' }) || [];
    } catch (error) {
        console.error("Error fetching series categories", error);
        return [];
    }
};

export const getSeries = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_series' };
        if (categoryId) params.category_id = categoryId;
        return await apiGet(baseUrl, params) || [];
    } catch (error) {
        console.error("Error fetching series", error);
        return [];
    }
};

export const getSeriesInfo = async (baseUrl, username, password, seriesId) => {
    try {
        return await apiGet(baseUrl, { username, password, action: 'get_series_info', series_id: seriesId });
    } catch (error) {
        console.error("Error fetching series info", error);
        return null;
    }
};
