import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';

const BASE_URL = 'https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/api';

export const StickerLabAPI = {
  
  createStickerPack: async (name, creatorId) => {
    const response = await axios.post(`${BASE_URL}/createStickerPack`, {
      name,
      creatorId,
    });
    return response.data;
  },

  uploadSticker: async (stickerPackId, imageUri) => {
    const formData = new FormData();
    formData.append('stickerPackId', stickerPackId);
    formData.append('sticker', {
      uri: imageUri,
      type: 'image/png',
      name: `sticker_${Date.now()}.png`,
    });

    const response = await axios.post(`${BASE_URL}/uploadSticker`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  incrementDownload: async (stickerPackId) => {
    const response = await axios.post(`${BASE_URL}/incrementDownload`, {
      stickerPackId,
    });
    return response.data;
  },

  getTopStickers: async (limit = 20) => {
    const response = await axios.get(`${BASE_URL}/topStickers`, {
      params: { limit },
    });
    return response.data.stickers;
  },
};
