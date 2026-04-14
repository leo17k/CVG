import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000', // Reemplaza con la URL de tu backend
    withCredentials: true, // ¡Crucial para enviar y recibir la cookie de sesión!
});

// En el componente de Login:
const handleLogin = async (credentials) => {
    try {
        const response = await api.post('/login', credentials);
        console.log('Sesión establecida', response.data);
        // Redirigir al usuario
    } catch (error) {
        console.error('Error de login', error);
    }
};

// En un componente que accede a una ruta protegida:
const fetchPerfil = async () => {
    try {
        const response = await api.get('/perfil');
        console.log('Datos del perfil:', response.data);
    } catch (error) {
        console.error('Acceso denegado', error);
    }
};