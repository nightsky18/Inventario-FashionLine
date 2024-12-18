const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Crear un producto
router.post('/', upload.single('foto'), async (req, res) => {
    const { nombre, categoria, talla, precio, cantidad } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;
    const bajoStock = cantidad < 5;
    const product = new Product({ nombre, categoria, talla, precio, cantidad, foto, bajoStock });
    await product.save();
    res.status(201).send(product);
});

// Obtener productos
router.get('/', async (req, res) => {
    const { nombre, categoria } = req.query;
    const filters = {};
    if (nombre) filters.nombre = new RegExp(nombre, 'i');
    if (categoria) filters.categoria = categoria;
    const products = await Product.find(filters);
    res.send(products);
});

// Actualizar un producto
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (updates.cantidad < 5) updates.bajoStock = true;
    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    res.send(product);
});

// Eliminar un producto
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.status(204).send();
});

module.exports = router;
