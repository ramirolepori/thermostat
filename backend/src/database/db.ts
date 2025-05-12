import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDB() {
  if (!MONGODB_URI) {
    console.error('❌ No se encontró la variable de entorno MONGODB_URI');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser y useUnifiedTopology ya no son necesarios en mongoose >= 6
    });
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB Atlas:', error);
    process.exit(1);
  }
}