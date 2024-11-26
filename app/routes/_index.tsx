import { Link } from "@remix-run/react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-8 shadow-2xl max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Página Principal</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Link 
            to="/restore" 
            className="block bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-300 rounded-lg shadow-lg"
          >
            <div className="w-full h-24 flex items-center justify-center text-lg font-semibold text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Restaurar Imagen
            </div>
          </Link>
          <Link 
            to="/face-to-sticker" 
            className="block bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-300 rounded-lg shadow-lg"
          >
            <div className="w-full h-24 flex items-center justify-center text-lg font-semibold text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
             Stiker
            </div>
          </Link>
          <Link 
            to="/generate" 
            className="block bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-300 rounded-lg shadow-lg"
          >
            <div className="w-full h-24 flex items-center justify-center text-lg font-semibold text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
             Generate Imagen
            </div>
          </Link>
          <Link 
            to="/transform-image" 
            className="block bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-300 rounded-lg shadow-lg"
          >
            <div className="w-full h-24 flex items-center justify-center text-lg font-semibold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Transform-Image
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

