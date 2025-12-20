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

        const response = await axios.get(`${formattedUrl}/player_api.php`, {
            params: {
                username,
                password
            }
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
        const response = await axios.get(`${baseUrl}/player_api.php`, {
            params: { username, password, action: 'get_live_categories' }
        });
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
        const response = await axios.get(`${baseUrl}/player_api.php`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching live streams", error);
        return [];
    }
};

export const getVodCategories = async (baseUrl, username, password) => {
    try {
        const response = await axios.get(`${baseUrl}/player_api.php`, {
            params: { username, password, action: 'get_vod_categories' }
        });
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
        const response = await axios.get(`${baseUrl}/player_api.php`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching VOD streams", error);
        return [];
    }
};

export const getVodInfo = async (baseUrl, username, password, vodId) => {
    try {
        const response = await axios.get(`${baseUrl}/player_api.php`, {
            params: { username, password, action: 'get_vod_info', vod_id: vodId }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching VOD info", error);
        return null;
    }
};

export const getSeriesCategories = async (baseUrl, username, password) => {
    try {
        const response = await axios.get(`${baseUrl}/player_api.php`, {
            params: { username, password, action: 'get_series_categories' }
        });
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
        const response = await axios.get(`${baseUrl}/player_api.php`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching series", error);
        return [];
    }
};

export const getSeriesInfo = async (baseUrl, username, password, seriesId) => {
    try {
        const response = await axios.get(`${baseUrl}/player_api.php`, {
            params: { username, password, action: 'get_series_info', series_id: seriesId }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching series info", error);
        return null;
    }
};
