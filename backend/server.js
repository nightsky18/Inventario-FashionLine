import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import mongoose from 'mongoose';
import open from 'open'; //  open ahora se importa
import { Product } from './models/Product.js'; 
import fs from 'fs/promises'; // Importa fs/promises para manejar la eliminación de archivos
import path from 'path'; // Importa path si no lo tienes
import { fileURLToPath } from 'url';

// Configuración para manejar rutas absolutas en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

// Configurar conexión a MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado a MongoDB');
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
        process.exit(1);
    }
};
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads')); // Todas las imágenes irán a 'uploads'
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nombres únicos
    }
});

const upload = multer({ storage });



// Servir la carpeta frontend como estática
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta principal para servir el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Rutas CRUD
app.post('/productos', upload.single('foto'), async (req, res) => {
    const { nombre, categoria, talla, precio, cantidad } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null; // 
    const bajoStock = cantidad < 5;
    const product = new Product({ nombre, categoria, talla, precio, cantidad, foto, bajoStock });
    await product.save();
    res.status(201).send(product);
});


app.get('/productos', async (req, res) => {
    const { nombre, categoria } = req.query;
    const filters = {};
    if (nombre) filters.nombre = new RegExp(nombre, 'i');
    if (categoria) filters.categoria = categoria;
    const products = await Product.find(filters);
    res.send(products);
});

app.put('/productos/:id', upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log('Datos recibidos para actualización:', req.body);
        console.log('Archivo recibido:', req.file);

        // Extraer datos del cuerpo de la solicitud
        const { nombre, categoria, talla, precio, cantidad } = req.body;
        
        // Validar datos de entrada
        if (!nombre || !categoria || !talla || !precio || !cantidad) {
            console.error('Datos incompletos para la actualización');
            return res.status(400).json({ 
                error: 'Datos incompletos', 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Preparar objeto de actualización
        const updates = {
            nombre,
            categoria,
            talla,
            precio: parseFloat(precio),
            cantidad: parseInt(cantidad)
        };

        // Verificar si se ha subido una nueva foto
        if (req.file) {
            updates.foto = `/uploads/${req.file.filename}`;
        }

        // Verificar stock bajo
        updates.bajoStock = updates.cantidad < 5;

        console.log('Datos para actualizar:', updates);

        // Actualizar producto
        const product = await Product.findByIdAndUpdate(id, updates, { 
            new: true,  // Devolver el documento actualizado
            runValidators: true  // Validar el esquema al actualizar
        });

        if (!product) {
            console.error(`Producto con ID ${id} no encontrado`);
            return res.status(404).json({ 
                error: 'Producto no encontrado',
                message: `No se encontró un producto con ID ${id}` 
            });
        }

        console.log('Producto actualizado:', product);
        res.json(product);

    } catch (error) {
        console.error('Error detallado al actualizar el producto:', error);
        res.status(500).json({ 
            error: 'Error al actualizar el producto',
            message: error.message,
            stack: error.stack // Solo para debugging
        });
    }
});

app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Buscar el producto en la base de datos
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Si el producto tiene una imagen asociada, eliminarla del sistema de archivos
        if (product.foto) {
            const imagePath = path.join(__dirname, product.foto);
            try {
                await fs.unlink(imagePath); // Eliminar la imagen
                console.log(`Imagen eliminada: ${imagePath}`);
            } catch (err) {
                console.error(`Error al eliminar la imagen: ${err.message}`);
            }
        }

        // Eliminar el producto de la base de datos
        await Product.findByIdAndDelete(id);
        res.status(204).send(); // Respuesta sin contenido
    } catch (error) {
        console.error(`Error al eliminar el producto: ${error.message}`);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});


//para subir imagen
app.post('/productos', upload.single('foto'), async (req, res) => {
    try {
        const { name, category, size, price, quantity } = req.body;
        const foto = req.file ? `/uploads/${req.file.filename}` : null; // Ruta de la imagen

        const newProduct = new Product({
            name,
            category,
            size,
            price,
            quantity,
            foto
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el producto' });
    }
});
// Iniciar servidor
const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    await open(`http://localhost:${PORT}`);
});
