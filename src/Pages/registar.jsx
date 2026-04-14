import React from 'react';

// Se crea un componente funcional principal llamado App,
// el cual contiene toda la lógica y la interfaz de la aplicación.
const App = () => {

    // Componente SocialButton para reutilizar el estilo de los botones de Google y Facebook.
    const SocialButton = ({ icon, text }) => (
        <button className="flex-1 border border-gray-300 rounded-lg py-2 px-4 flex items-center justify-center space-x-2 text-gray-600 hover:bg-gray-100 transition-colors">
            {icon}
            <span>{text}</span>
        </button>
    );

    // Ícono de Google SVG
    const GoogleIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
            <defs>
                <path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37.5 24 37.5c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.5-6.5C38.6 4.6 31.8 1 24 1 12.9 1 3.5 10.4 3.5 21.5s9.4 20.5 20.5 20.5c11.1 0 20.5-9.4 20.5-20.5z"/>
            </defs>
            <clipPath id="b">
                <use xlinkHref="#a" overflow="visible"/>
            </clipPath>
            <path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/>
            <path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/>
            <path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1.5L48 0v48H0z"/>
            <path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/>
        </svg>
    );

    // Ícono de Facebook SVG
    const FacebookIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4267B2" d="M14.07 16.59l.86 5.56h-5.26v-13.88h-3.56v-5.56h3.56v-3.87c0-2.81 1.05-4.22 3.86-4.22h4.53v5.56h-2.52c-.93 0-1.07.35-1.07 1.05v2.85h3.84l-.5 5.56h-3.34z"/>
        </svg>
    );

    return (
        <>
            <style>
                {`
                body {
                    font-family: 'Poppins', sans-serif;
                }
                .container-shadow {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .gradient-bg {
                    background-image: linear-gradient(to bottom right, #7b58c8, #2a225e);
                }
                `}
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />

            <div className="bg-white rounded-3xl container-shadow flex max-w-4xl w-full overflow-hidden">
                
                {/* Sección Izquierda: Ilustración */}
                <div className="gradient-bg text-white p-8 hidden md:flex md:flex-col md:w-1/2 justify-center items-start relative">
                    <h1 className="font-semibold text-4xl mb-4">B</h1>
                    <p className="text-lg">A Buddy for all your Binge watching.</p>
                    <img src="https://via.placeholder.com/350" alt="Illustration" className="absolute bottom-0 left-0 w-full object-cover"/>
                </div>

                {/* Sección Derecha: Formulario */}
                <div className="p-8 md:p-12 w-full md:w-1/2">
                    <div className="flex justify-end">
                        <span className="text-gray-500 text-sm">English (UK) <span className="ml-1">&#9660;</span></span>
                    </div>
                    
                    <h2 className="text-3xl font-semibold text-gray-800 mt-4 mb-8">Create Account</h2>

                    <div className="flex space-x-4 mb-8">
                        <SocialButton icon={<GoogleIcon />} text="Sign Up with Google" />
                        <SocialButton icon={<FacebookIcon />} text="Sign Up with Facebook" />
                    </div>

                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-500">-OR-</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <form className="space-y-4">
                        <input type="text" placeholder="Full Name" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <input type="email" placeholder="Email Address" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <input type="password" placeholder="Password" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        
                        <button type="submit" className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors">
                            Create Account
                        </button>
                    </form>

                    <p className="text-center text-gray-600 mt-6">
                        Already have an account? <a href="#" className="text-blue-600 hover:underline">Log In</a>
                    </p>
                </div>
            </div>
        </>
    );
};

export default App;
