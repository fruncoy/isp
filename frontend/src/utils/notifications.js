import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const createNotification = async (userId, title, message) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};
