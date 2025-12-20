import axios from 'axios';

export const authenticate = async (baseUrl, username, password) => {
    try {
        // Ensure protocol is present
        let formattedUrl = baseUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `http://${formattedUrl}`;
        }

        // Remove trailing slash
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }

        const shouldUseProxy = (targetUrl) => {
            // Check if running in browser environment
            if (typeof window !== 'undefined') {
                // If current page is HTTPS and target is HTTP, we MUST use proxy
                const isPageHttps = window.location.protocol === 'https:';
                const isTargetHttp = targetUrl.startsWith('http://');
                if (isPageHttps && isTargetHttp) return true;

                // Optional: Force proxy for CORS issues if needed, but start with Mixed Content fix
                // return true; 
            }
            return false;
        };

        let requestUrl = `${formattedUrl}/player_api.php`;
        let requestParams = { username, password };

        if (shouldUseProxy(formattedUrl)) {
            // Use local Vercel proxy
            requestUrl = '/api/proxy';
            requestParams = {
                url: `${formattedUrl}/player_api.php`,
                username,
                password
            };
        }

        const response = await axios.get(requestUrl, {
            params: requestParams
        });

        if (response.data && response.data.user_info && response.data.user_info.auth === 1) {
            return { success: true, data: response.data, serverUrl: formattedUrl };
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
        let requestUrl = `${baseUrl}/player_api.php`;
        let params = { username, password, action: 'get_live_categories' };

        // Simple Proxy Logic inline for now
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params = {
                url: `${baseUrl}/player_api.php`,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching live categories", error);
        return [];
    }
};

export const getLiveStreams = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_live_streams' };
        if (categoryId) {
            params.category_id = categoryId;
        }

        let requestUrl = `${baseUrl}/player_api.php`;
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params.url = `${baseUrl}/player_api.php`;
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching live streams", error);
        return [];
    }
};

export const getVodCategories = async (baseUrl, username, password) => {
    try {
        let requestUrl = `${baseUrl}/player_api.php`;
        let params = { username, password, action: 'get_vod_categories' };

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params = {
                url: `${baseUrl}/player_api.php`,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching VOD categories", error);
        return [];
    }
};

export const getVodStreams = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_vod_streams' };
        if (categoryId) {
            params.category_id = categoryId;
        }

        let requestUrl = `${baseUrl}/player_api.php`;
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params.url = `${baseUrl}/player_api.php`;
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching VOD streams", error);
        return [];
    }
};

export const getVodInfo = async (baseUrl, username, password, vodId) => {
    try {
        let requestUrl = `${baseUrl}/player_api.php`;
        let params = { username, password, action: 'get_vod_info', vod_id: vodId };

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params = {
                url: `${baseUrl}/player_api.php`,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching VOD info", error);
        return null;
    }
};

export const getSeriesCategories = async (baseUrl, username, password) => {
    try {
        let requestUrl = `${baseUrl}/player_api.php`;
        let params = { username, password, action: 'get_series_categories' };

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params = {
                url: `${baseUrl}/player_api.php`,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching series categories", error);
        return [];
    }
};

export const getSeries = async (baseUrl, username, password, categoryId = null) => {
    try {
        const params = { username, password, action: 'get_series' };
        if (categoryId) {
            params.category_id = categoryId;
        }

        let requestUrl = `${baseUrl}/player_api.php`;
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params.url = `${baseUrl}/player_api.php`;
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching series", error);
        return [];
    }
};

export const getSeriesInfo = async (baseUrl, username, password, seriesId) => {
    try {
        let requestUrl = `${baseUrl}/player_api.php`;
        let params = { username, password, action: 'get_series_info', series_id: seriesId };

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
            requestUrl = '/api/proxy';
            params = {
                url: `${baseUrl}/player_api.php`,
                ...params
            };
        }

        const response = await axios.get(requestUrl, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching series info", error);
        return null;
    }
};
