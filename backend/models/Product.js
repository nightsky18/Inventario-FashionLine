import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: { type: String, required: true },
    talla: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true },
    foto: { type: String },
    bajoStock: { type: Boolean },
});

export const Product = mongoose.model('Product', productSchema);
