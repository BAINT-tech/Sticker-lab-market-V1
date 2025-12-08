import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import * as busboy from 'busboy';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const db = admin.firestore();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'ds2ecbamt',
  api_key: '789532531674775',
  api_secret: 'dN6Dt16Opil8NV4hQOKaPf74pzQ'
});

interface StickerPack {
  id?: string;
  name: string;
  creatorId: string;
  stickerUrls: string[];
  downloads: number;
  createdAt: admin.firestore.Timestamp;
}

// CREATE STICKER PACK
app.post('/createStickerPack', async (req, res) => {
  try {
    const { name, creatorId } = req.body;

    if (!name || !creatorId) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and creatorId' 
      });
    }

    const stickerPackData: StickerPack = {
      name: name.trim(),
      creatorId,
      stickerUrls: [],
      downloads: 0,
      createdAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection('stickerPacks').add(stickerPackData);

    res.status(201).json({
      success: true,
      stickerPackId: docRef.id,
      data: { ...stickerPackData, id: docRef.id }
    });

  } catch (error) {
    console.error('Error creating sticker pack:', error);
    res.status(500).json({ error: 'Failed to create sticker pack' });
  }
});

// UPLOAD STICKER TO CLOUDINARY
app.post('/uploadSticker', async (req, res) => {
  try {
    const bb = busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const uploads: { [key: string]: string } = {};
    let stickerPackId = '';

    bb.on('file', (fieldname, file, info) => {
      const { filename } = info;
      const filepath = path.join(tmpdir, filename);
      uploads[fieldname] = filepath;
      file.pipe(fs.createWriteStream(filepath));
    });

    bb.on('field', (fieldname, value) => {
      if (fieldname === 'stickerPackId') {
        stickerPackId = value;
      }
    });

    bb.on('finish', async () => {
      try {
        if (!stickerPackId) {
          return res.status(400).json({ error: 'stickerPackId is required' });
        }

        const fileToUpload = uploads['sticker'];
        if (!fileToUpload) {
          return res.status(400).json({ error: 'No sticker file provided' });
        }

        const packRef = db.collection('stickerPacks').doc(stickerPackId);
        const packDoc = await packRef.get();

        if (!packDoc.exists) {
          return res.status(404).json({ error: 'Sticker pack not found' });
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(fileToUpload, {
          folder: `stickers/${stickerPackId}`,
          resource_type: 'image',
          public_id: `sticker_${Date.now()}`
        });

        const publicUrl = uploadResult.secure_url;

        // Update Firestore
        await packRef.update({
          stickerUrls: admin.firestore.FieldValue.arrayUnion(publicUrl)
        });

        // Cleanup temp file
        fs.unlinkSync(fileToUpload);

        res.status(200).json({
          success: true,
          stickerUrl: publicUrl,
          stickerPackId
        });

      } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to upload sticker' });
      }
    });

    bb.end(req.rawBody);

  } catch (error) {
    console.error('Error in upload handler:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// INCREMENT DOWNLOAD COUNTER
app.post('/incrementDownload', async (req, res) => {
  try {
    const { stickerPackId } = req.body;

    if (!stickerPackId) {
      return res.status(400).json({ error: 'stickerPackId is required' });
    }

    const packRef = db.collection('stickerPacks').doc(stickerPackId);
    
    await db.runTransaction(async (transaction) => {
      const packDoc = await transaction.get(packRef);
      
      if (!packDoc.exists) {
        throw new Error('Sticker pack not found');
      }

      const currentDownloads = packDoc.data()?.downloads || 0;
      transaction.update(packRef, { 
        downloads: currentDownloads + 1 
      });
    });

    res.status(200).json({ 
      success: true, 
      message: 'Download count incremented' 
    });

  } catch (error) {
    console.error('Error incrementing download:', error);
    
    if (error instanceof Error && error.message === 'Sticker pack not found') {
      return res.status(404).json({ error: 'Sticker pack not found' });
    }
    
    res.status(500).json({ error: 'Failed to increment download' });
  }
});

// GET TOP STICKERS (TRENDING CHART)
app.get('/topStickers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const snapshot = await db.collection('stickerPacks')
      .orderBy('downloads', 'desc')
      .limit(limit)
      .get();

    const topStickers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      count: topStickers.length,
      stickers: topStickers
    });

  } catch (error) {
    console.error('Error fetching top stickers:', error);
    res.status(500).json({ error: 'Failed to fetch top stickers' });
  }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export const api = functions.https.onRequest(app);
