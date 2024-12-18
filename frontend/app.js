const apiUrl = 'http://localhost:3000/productos';

let editingProductId = null;



function showAlert(message, type = 'success') {
    // Crear el elemento de alerta
    const alert = document.createElement('div');
    alert.className = `custom-alert ${type}`;
    
    // Crear el icono según el tipo
    let icon = '';
    switch(type) {
        case 'success':
            icon = '✅';
            break;
        case 'error':
            icon = '❌';
            break;
        case 'warning':
            icon = '⚠️';
            break;
    }
    
    alert.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span class="alert-message">${message}</span>
    `;
    
    // Añadir al DOM
    document.body.appendChild(alert);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 300);
    }, 3000);
}


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('productForm');
    const categorySelect = document.getElementById('category');
    const sizeSelect = document.getElementById('size');
    const searchInput = document.getElementById('search');
    const inventoryTable = document.getElementById('inventory').querySelector('tbody');
    const submitButton = form.querySelector('button[type="submit"]');
    const priceInput = document.getElementById('price');
    const quantityInput = document.getElementById('quantity');
    const photoInput = document.getElementById('photo');

    const sizes = {
        "Camiseta": ["XS", "S", "M", "L", "XL"],
        "Blusa": ["XS", "S", "M", "L", "XL"],
        "Ropa Interior": ["XS", "S", "M", "L", "XL"],
        "Jean Femenino": ["4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24"],
        "Jean Masculino": ["28", "30", "32", "34", "36", "38", "40", "42", "44"],
        "Pantalon": ["XS", "S", "M", "L", "XL"],
        "Accesorios": ["No aplica"],
        "Calzado": ["22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]
    };

    // Actualizar tallas al cambiar categoría
    categorySelect.addEventListener('change', () => {
        sizeSelect.innerHTML = '<option value="" selected disabled>Seleccione una talla</option>';
        const categorySizes = sizes[categorySelect.value];
        if (categorySizes) {
            categorySizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                sizeSelect.appendChild(option);
            });
        }
    });

    // Validar campos requeridos antes de enviar
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        // Validación adicional
        if (!categorySelect.value || !sizeSelect.value) {
            showAlert('Por favor, seleccione una categoría y una talla válida.', 'warning');
            return;
        }
    
        const price = parseFloat(priceInput.value);
        const quantity = parseInt(quantityInput.value, 10);
        const photo = photoInput.files[0];
    
        if (isNaN(price) || price <= 0) {
            showAlert('El precio debe ser un valor positivo.', 'warning');
            return;
        }
    
        if (isNaN(quantity) || quantity <= 0) {
            showAlert('La cantidad debe ser un número entero positivo.', 'warning');
            return;
        }
    
        const data = new FormData(form);
    
        // Nuevo: Si no hay foto seleccionada y estamos editando, no incluir la foto en los datos
        if (editingProductId && !photo) {
            data.delete('photo');
        }
    
        try {
            if (editingProductId) {
                if (!photo && editingProductId) {
                    data.delete('photo');
                }
                
                // Actualizar producto existente
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    body: data
                });
                await fetch(`${apiUrl}/${editingProductId}`, {
                    method: 'DELETE',
                });
                const previewImage = document.getElementById('previewImage');
             
                    previewImage.src = null;
                  
                
                // Verificar si la actualización fue exitosa
                if (!response.ok) {
                    try {
                        const errorData = await response.json();
                        console.error('Detalles del error:', errorData);
                        throw new Error(errorData.message || 'Error al actualizar el producto');
                    } catch (parseError) {
                        console.error('Error al parsear respuesta de error:', parseError);
                        throw new Error('Error al actualizar el producto');
                    }
                }
            } else {
                // Agregar nuevo producto
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    body: data
                });
    
                // Verificar si la creación fue exitosa
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error en la respuesta:', errorText);
                    throw new Error('Error al agregar el producto');
                }
    
                showAlert('Producto agregado correctamente', 'success');
            }
            
            form.reset();
            sizeSelect.innerHTML = '<option value="" selected disabled>Seleccione una talla</option>';
            loadInventory();
        } catch (error) {
            console.error('Error al guardar el producto:', error);
            alert(`Hubo un error al guardar el producto: ${error.message}`);
        }
    });
    
    // Desactivar el botón de envío hasta que el formulario sea válido
    form.addEventListener('input', () => {
        submitButton.disabled = !form.checkValidity();
    });

    // Buscar productos
    searchInput.addEventListener('input', () => loadInventory(searchInput.value));

    async function loadInventory(query = '') {
        try {
            const response = await fetch(`${apiUrl}?nombre=${query}`);
            const products = await response.json();
            inventoryTable.innerHTML = '';
            
            const searchType = document.getElementById('searchType').value;
            
            // Filtrar productos según el tipo de búsqueda seleccionado
            const filteredProducts = products.filter(product => {
                const searchLower = query.toLowerCase();
                
                switch(searchType) {
                    case 'name':
                        return product.nombre.toLowerCase().includes(searchLower);
                    case 'category':
                        return product.categoria.toLowerCase().includes(searchLower);
                    case 'all':
                    default:
                        return product.nombre.toLowerCase().includes(searchLower) || 
                               product.categoria.toLowerCase().includes(searchLower);
                }
            });
    
            filteredProducts.forEach(product => {
                const row = document.createElement('tr');
                
                if (product.cantidad < 10) {
                    row.classList.add('low-stock');
                }
                
                row.innerHTML = `
                <td><img src="${product.foto}" alt="${product.nombre}" style="width: 100px; height: auto;"></td>
                <td>${product.nombre}</td>
                <td>${product.categoria}</td>
                <td>${product.talla}</td>
                <td>${product.precio}</td>
                <td>${product.cantidad} ${product.cantidad < 10 ? '⚠️' : ''}</td>
                <td>
                    <button onclick="loadProductForEdit('${product._id}', '${product.nombre}', '${product.categoria}', '${product.talla}', ${product.precio}, ${product.cantidad}, '${product.foto}')">Editar</button>
                    <button onclick="deleteProduct('${product._id}')">Eliminar</button>
                </td>
                `;
                inventoryTable.appendChild(row);
            });
    
            // Mostrar mensaje si no hay resultados
            if (filteredProducts.length === 0) {
                const noResultsRow = document.createElement('tr');
                noResultsRow.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        No se encontraron productos que coincidan con la búsqueda.
                    </td>
                `;
                inventoryTable.appendChild(noResultsRow);
            }
        } catch (error) {
            console.error('Error al cargar inventario:', error);
            alert('No se pudo cargar el inventario.');
        }
    }
    
    // Modificar el event listener para incluir cambios en el filtro
    document.addEventListener('DOMContentLoaded', () => {
        // ... resto del código existente ...
    
        const searchInput = document.getElementById('search');
        const searchType = document.getElementById('searchType');
    
        // Actualizar búsqueda cuando se escribe o se cambia el filtro
        searchInput.addEventListener('input', () => loadInventory(searchInput.value));
        searchType.addEventListener('change', () => loadInventory(searchInput.value));
    });

    // Eliminar producto
    window.deleteProduct = async (id) => {
        try {
            await fetch(`${apiUrl}/${id}`, {
                method: 'DELETE'
            });
            showAlert('Producto eliminado correctamente', 'success');
            loadInventory();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            showAlert('Hubo un error al eliminar el producto', 'error');
        }
    };

    window.loadProductForEdit = async (id, nombre, categoria, talla, precio, cantidad, foto) => {
        editingProductId = id;
    
        // Llenar los campos del formulario con los valores del producto
        document.getElementById('name').value = nombre;
        document.getElementById('category').value = categoria;
        document.getElementById('category').dispatchEvent(new Event('change'));
        setTimeout(() => {
            document.getElementById('size').value = talla;
        }, 50);
    
        document.getElementById('price').value = precio;
        document.getElementById('quantity').value = cantidad;
    
        // Mostrar la vista previa de la imagen si existe
        const previewImage = document.getElementById('previewImage');
        if (foto) {
            previewImage.src = foto;
            previewImage.style.display = 'block';
        } else {
            previewImage.style.display = 'none';
        }
    
        // Cambiar el texto del botón
        const submitButton = document.querySelector('button[type="submit"]');
        submitButton.textContent = 'Guardar Cambios';
    
        // Desplazar suavemente al formulario
        const productForm = document.getElementById('productForm');
        productForm.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    
        console.log(`Editando producto con ID: ${id}`);
    };
    
    // Cargar inventario inicial
    loadInventory();
});