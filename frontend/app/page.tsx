import Navbar from '@/components/Landing/Navbar';
import Hero from '@/components/Landing/Hero';
import Features from '@/components/Landing/Features';
import PortalSelect from '@/components/Landing/PortalSelect';
import Stats from '@/components/Landing/Stats';
import Footer from '@/components/Landing/Footer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <PortalSelect />
      <Footer />
    </main>
  );
}
