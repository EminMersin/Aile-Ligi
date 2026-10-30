import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Aile fotoğrafı için saklanan görüntünün en büyük genişliği (piksel). */
const PHOTO_MAX_WIDTH = 512;
/** JPEG sıkıştırma kalitesi — 512 px'te ~20-50 KB base64 metin üretir. */
const PHOTO_QUALITY = 0.6;

/** Galeri izni verilmediğinde fırlatılır; ekranlar bunu ayrı mesajla gösterir. */
export class PhotoPermissionError extends Error {
  constructor() {
    super('photo_permission');
    this.name = 'PhotoPermissionError';
  }
}

/**
 * Galeriden kare (1:1) bir fotoğraf seçtirir, 512 px'e küçültüp JPEG olarak
 * sıkıştırır ve `data:image/jpeg;base64,...` biçiminde döndürür.
 * Kullanıcı seçimden vazgeçerse null döner.
 *
 * Not: Aile fotoğrafı yalnızca tek bir görsel olduğu için base64 metin olarak
 * veritabanında tutulur (bkz. 0009 göçü).
 */
export async function pickFamilyPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionError();
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  if (picked.canceled || !picked.assets[0]) return null;

  const resized = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: PHOTO_MAX_WIDTH } }],
    { base64: true, compress: PHOTO_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  if (!resized.base64) return null;

  return `data:image/jpeg;base64,${resized.base64}`;
}
