import './globals.css';
import { ReduxProvider } from '../redux/provider.js';
import Navbar from '../components/Navbar.js';
import Toast from '../components/Toast.js';

export const metadata = {
  title: 'Dropyhub - Curated Physical Assets & Depository Reserves',
  icons: { icon: '/logo.png', apple: '/logo.png' },
  description: 'The global institutional platform for physical precious assets, accredited numismatics, and insured custody vaults with verifiable provenance.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f9f9f9] text-[#1a1c1c] antialiased min-h-screen flex flex-col font-inter">
        <ReduxProvider>
          <Navbar />
          <main className="flex-1 w-full">
            {children}
          </main>
          <Toast />
        </ReduxProvider>
      </body>
    </html>
  );
}
